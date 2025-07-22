// backend/src/routes/resourceRoutes.js
// This file defines the API routes for managing resources.

import { Router } from 'express';
import prisma from '../../prismaClient.js'; // Import the Prisma client
// Import authentication and role middleware from our shared authMiddleware.js
import { authMiddleware, requireDbUserAndAuthorize, checkResourceOwnership } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @route POST /api/resources
 * @description Creates a new resource (note, syllabus, PYQ, or external link).
 * @access Private (restricted to authenticated contributors or admins)
 * @body {
 * title: string,
 * description: string,
 * subject: string,
 * resourceType: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ',
 * semester?: string,
 * year?: number, // NEW: Year field for PYQ
 * isPrivate?: boolean,
 * allowContact?: boolean,
 * // For file-based resources (received directly in body after client-side processing/upload):
 * fileName?: string,
 * filePath?: string, // This will be the URL/path where the file is stored (e.g., from Supabase Storage)
 * fileSize?: number,
 * mimeType?: string,
 * // For link-based resources:
 * url?: string,
 * isExternal?: boolean,
 * tags?: string[] // Assuming tags are sent as an array of strings
 * }
 */
router.post('/', authMiddleware, requireDbUserAndAuthorize('CONTRIBUTOR', 'ADMIN'), async (req, res) => {
  // uploaderId is now extracted from the authenticated user via req.dbUser
  const uploaderId = req.dbUser.id; // Use the ID from your database user object

  const {
    title,
    description,
    subject,
    resourceType,
    semester,
    year, // Destructure year
    isPrivate = false,
    allowContact = true,
    fileName,
    filePath,
    fileSize,
    mimeType,
    url,
    isExternal = false,
    tags = [], // Expect tags as an array now
  } = req.body;

  // Basic validation
  if (!title || !description || !subject || !resourceType) {
    return res.status(400).json({ message: 'Missing required fields: title, description, subject, resourceType.' });
  }

  // Ensure consistency based on resourceType
  if (resourceType === 'LINK') {
    if (!url) {
      return res.status(400).json({ message: 'URL is required for LINK type resources.' });
    }
    // For LINK, file-related fields and year should not be present
    if (filePath || fileName || fileSize || mimeType || year) {
      return res.status(400).json({ message: 'File/Year-related fields should not be present for LINK type resources.' });
    }
  } else { // For file-based resources including PYQ
    if (!filePath) { // filePath is expected to be the URL of the uploaded file
      return res.status(400).json({ message: 'File path (URL) is required for file-based resources.' });
    }
    if (url) { // URL should not be present for file-based resources
      return res.status(400).json({ message: 'URL should not be present for file-based resources.' });
    }
    if (resourceType === 'PYQ' && !year) { // Year is required for PYQ
      return res.status(400).json({ message: 'Year is required for PYQ resource type.' });
    }
  }

  try {
    const newResource = await prisma.resource.create({
      data: {
        title,
        description,
        subject,
        resourceType,
        semester,
        year: resourceType === 'PYQ' ? year : null, // Conditionally set year
        isPrivate,
        allowContact,
        fileName: resourceType !== 'LINK' ? fileName : null,
        filePath: resourceType !== 'LINK' ? filePath : null,
        fileSize: resourceType !== 'LINK' ? fileSize : null,
        mimeType: resourceType !== 'LINK' ? mimeType : null,
        url: resourceType === 'LINK' ? url : null,
        isExternal: resourceType === 'LINK' ? true : false,
        uploader: {
          connect: { id: uploaderId }, // Connect to the authenticated user's ID
        },
        // Handle tags
        tags: {
          create: await Promise.all(tags.map(async (tagName) => {
            const tag = await prisma.tag.upsert({
              where: { name: tagName.toLowerCase().trim() },
              update: {},
              create: { name: tagName.toLowerCase().trim() }
            });
            return { tagId: tag.id };
          }))
        }
      },
      include: { // Include relations to return a complete resource object
        uploader: {
          select: { id: true, name: true, email: true, institution: true, avatar: true }
        },
        tags: {
          include: { tag: true }
        }
      }
    });

    // Format response to match frontend Resource interface
    const formattedResource = {
      id: newResource.id,
      title: newResource.title,
      description: newResource.description,
      subject: newResource.subject,
      resourceType: newResource.resourceType,
      semester: newResource.semester,
      year: newResource.year, // Include year in response
      isPrivate: newResource.isPrivate,
      allowContact: newResource.allowContact,
      fileName: newResource.fileName,
      filePath: newResource.filePath,
      fileSize: newResource.fileSize,
      mimeType: newResource.mimeType,
      url: newResource.url,
      isExternal: newResource.isExternal,
      views: newResource.views,
      downloads: newResource.downloads,
      bookmarks: newResource.bookmarks,
      version: newResource.version,
      createdAt: newResource.createdAt.toISOString(),
      updatedAt: newResource.updatedAt.toISOString(),
      uploaderId: newResource.uploaderId,
      uploader: {
        id: newResource.uploader.id,
        name: newResource.uploader.name,
        email: newResource.uploader.email,
        allowContact: newResource.uploader.allowContact // Assuming allowContact exists on uploader
      },
      tags: newResource.tags.map(rt => ({ id: rt.id, tag: rt.tag })),
    };

    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully',
      data: formattedResource
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    // In a real app, if file was uploaded to external storage, you'd delete it here on DB error
    res.status(500).json({ message: 'Failed to create resource', error: error.message });
  }
});

/**
 * @route GET /api/resources
 * @description Fetches all resources or filters by subject, semester, resourceType, year, and search query.
 * @access Public
 * @query {page?: number, limit?: number, subject?: string, resourceType?: string, semester?: string, search?: string, sortBy?: 'newest' | 'oldest' | 'popular' | 'downloads' | 'title', year?: number}
 */
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 10,
    subject,
    resourceType,
    semester,
    search,
    sortBy = 'newest',
    year // Destructure year
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build where clause
  const where = {
    isPrivate: false, // Only show public resources by default
    ...(subject && { subject: { equals: subject, mode: 'insensitive' } }), // Case-insensitive subject match
    ...(resourceType && { resourceType: resourceType.toUpperCase() }), // Ensure uppercase for enum
    ...(semester && { semester: { equals: semester, mode: 'insensitive' } }), // Case-insensitive semester match
    ...(year && !isNaN(parseInt(year)) && { year: parseInt(year) }), // Filter by year if provided and valid
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        // To search by tag name, you need to query through the junction table
        { tags: { some: { tag: { name: { contains: search, mode: 'insensitive' } } } } }
      ]
    })
  };

  // Build orderBy clause
  let orderBy;
  switch (sortBy) {
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'popular':
      orderBy = { views: 'desc' };
      break;
    case 'downloads':
      orderBy = { downloads: 'desc' };
      break;
    case 'title':
      orderBy = { title: 'asc' };
      break;
    default: // 'newest'
      orderBy = { createdAt: 'desc' };
  }

  try {
    const [resources, totalCount] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
              institution: true,
              avatar: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              bookmarks: true
            }
          }
        }
      }),
      prisma.resource.count({ where })
    ]);

    // Format response
    const formattedResources = resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      year: resource.year, // Include year in response
      fileName: resource.fileName,
      filePath: resource.filePath, // Include filePath for viewing/downloading
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      url: resource.url, // Include URL for link types
      isExternal: resource.isExternal,
      views: resource.views,
      downloads: resource.downloads,
      bookmarks: resource._count.bookmarks,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
      uploader: resource.uploader,
      tags: resource.tags.map(rt => rt.tag.name), // Flatten tags for frontend
      isPrivate: resource.isPrivate,
      allowContact: resource.allowContact
    }));

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        resources: formattedResources,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resources'
    });
  }
});

/**
 * @route GET /api/resources/:id
 * @description Fetches a single resource by its ID.
 * @access Public
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            institution: true,
            bio: true,
            contactInfo: true, // Assuming contactInfo exists on uploader
            avatar: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        _count: {
          select: {
            bookmarks: true
          }
        }
      }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if resource is private and user doesn't own it
    // This part assumes `req.dbUser` is available from authMiddleware if user is authenticated.
    // For a public route, if you want to restrict private resources, you need to check authentication.
    // If this route is truly public, private resources should not be returned here at all,
    // or a separate authenticated route should exist for them.
    // For now, if it's private and user is not authenticated, return 403.
    // If authenticated, check ownership.
    if (resource.isPrivate) {
      // If req.dbUser is not present (unauthenticated request) or user is not the uploader
      if (!req.dbUser || resource.uploaderId !== req.dbUser.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: This resource is private.'
        });
      }
    }

    // Increment view count
    await prisma.resource.update({
      where: { id },
      data: { views: { increment: 1 } }
    });

    // Log activity if user is authenticated (using req.dbUser from authMiddleware)
    if (req.dbUser) { // Only log activity if a user is authenticated
      try {
        await prisma.activity.create({
          data: {
            userId: req.dbUser.id, // Use req.dbUser.id
            resourceId: id,
            action: 'VIEW'
          }
        });
      } catch (activityError) {
        console.error('Error logging view activity:', activityError);
        // Do not block the request if activity logging fails
      }
    }

    // Format response
    const formattedResource = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      fileName: resource.fileName,
      filePath: resource.filePath, // Include filePath
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      url: resource.url, // Include URL
      isExternal: resource.isExternal,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      year: resource.year, // Include year
      views: resource.views + 1, // Include the incremented view
      downloads: resource.downloads,
      bookmarks: resource.bookmarks,
      allowContact: resource.allowContact,
      isPrivate: resource.isPrivate,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
      uploader: resource.uploader,
      tags: resource.tags.map(rt => rt.tag.name)
    };

    res.json({
      success: true,
      data: formattedResource
    });
  } catch (error) {
    console.error('Get resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource'
    });
  }
});

/**
 * @route GET /api/my-resources - Get user's uploaded resources (Protected)
 * @access Private (authenticated user only)
 */
router.get('/my/resources', authMiddleware, requireDbUserAndAuthorize(), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    if (!req.dbUser || !req.dbUser.id) {
      return res.status(401).json({ success: false, message: 'Authentication required to view your resources.' });
    }

    const [resources, totalCount] = await Promise.all([
      prisma.resource.findMany({
        where: { uploaderId: req.dbUser.id }, // Use req.dbUser.id
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          tags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              bookmarks: true
            }
          }
        }
      }),
      prisma.resource.count({
        where: { uploaderId: req.dbUser.id } // Use req.dbUser.id
      })
    ]);

    const formattedResources = resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      year: resource.year, // Include year
      fileName: resource.fileName,
      filePath: resource.filePath,
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      url: resource.url,
      isExternal: resource.isExternal,
      views: resource.views,
      downloads: resource.downloads,
      bookmarks: resource._count.bookmarks,
      isPrivate: resource.isPrivate,
      allowContact: resource.allowContact,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
      tags: resource.tags.map(rt => rt.tag.name)
    }));

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        resources: formattedResources,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get my resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your resources'
    });
  }
});

/**
 * @route PUT /api/resources/:id - Update resource (Protected, Owner only)
 * @access Private (authenticated contributor/admin who owns the resource)
 */
router.put('/:id',
  authMiddleware,
  requireDbUserAndAuthorize('CONTRIBUTOR', 'ADMIN'),
  checkResourceOwnership, // Ensures only owner or admin can update
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        subject,
        semester,
        year, // Destructure year
        tags, // Tags expected as an array of strings
        isPrivate,
        allowContact,
        fileName, // Allow updating file info if needed
        filePath,
        fileSize,
        mimeType,
        url,
        isExternal
      } = req.body;

      // Build data object for update, only include fields that are provided
      const updateData = {
        ...(title && { title }),
        ...(description && { description }),
        ...(subject && { subject }),
        ...(semester && { semester }),
        ...(year && { year }), // Include year in update
        ...(typeof isPrivate === 'boolean' && { isPrivate }),
        ...(typeof allowContact === 'boolean' && { allowContact }),
        ...(fileName && { fileName }),
        ...(filePath && { filePath }),
        ...(fileSize && { fileSize }),
        ...(mimeType && { mimeType }),
        ...(url && { url }),
        ...(typeof isExternal === 'boolean' && { isExternal }),
      };

      // Update resource
      const updatedResource = await prisma.resource.update({
        where: { id },
        data: updateData
      });

      // Handle tags update if provided
      if (tags && Array.isArray(tags)) {
        // Remove existing tags for this resource
        await prisma.resourceTag.deleteMany({
          where: { resourceId: id }
        });

        // Add new tags
        if (tags.length > 0) {
          const tagPromises = tags.map(async (tagName) => {
            const tag = await prisma.tag.upsert({
              where: { name: tagName.toLowerCase().trim() },
              update: {},
              create: { name: tagName.toLowerCase().trim() }
            });

            return prisma.resourceTag.create({
              data: {
                resourceId: id,
                tagId: tag.id
              }
            });
          });
          await Promise.all(tagPromises);
        }
      }

      // Fetch updated resource with relations for response
      const resource = await prisma.resource.findUnique({
        where: { id },
        include: {
          uploader: {
            select: { id: true, name: true, email: true, institution: true, avatar: true }
          },
          tags: {
            include: { tag: true }
          }
        }
      });

      // Format response
      const formattedResource = {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        subject: resource.subject,
        resourceType: resource.resourceType,
        semester: resource.semester,
        year: resource.year, // Include year
        isPrivate: resource.isPrivate,
        allowContact: resource.allowContact,
        fileName: resource.fileName,
        filePath: resource.filePath,
        fileSize: resource.fileSize,
        mimeType: resource.mimeType,
        url: resource.url,
        isExternal: resource.isExternal,
        views: resource.views,
        downloads: resource.downloads,
        bookmarks: resource.bookmarks,
        version: resource.version,
        createdAt: resource.createdAt.toISOString(),
        updatedAt: resource.updatedAt.toISOString(),
        uploader: resource.uploader,
        tags: resource.tags.map(rt => rt.tag.name),
      };

      res.json({
        success: true,
        message: 'Resource updated successfully',
        data: formattedResource
      });
    } catch (error) {
      console.error('Update resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update resource'
      });
    }
  }
);

/**
 * @route DELETE /api/resources/:id - Delete resource (Protected, Owner only)
 * @access Private (authenticated contributor/admin who owns the resource)
 */
router.delete('/:id',
  authMiddleware,
  requireDbUserAndAuthorize('CONTRIBUTOR', 'ADMIN'),
  checkResourceOwnership,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get resource to find file path for deletion (if applicable)
      const resource = await prisma.resource.findUnique({
        where: { id },
        select: { filePath: true, resourceType: true } // Select resourceType to check if it's a LINK
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Delete resource from database (this will cascade delete related records like ResourceTags)
      await prisma.resource.delete({
        where: { id }
      });

      // Only attempt to delete file from filesystem if it's not an external link
      if (resource.filePath && resource.resourceType !== 'LINK') {
        try {
          // Assuming deleteFile is a function that handles file system deletion
          // You would need to define or import `deleteFile` from your uploadMiddleware
          // For now, this is a placeholder for actual file system deletion logic
          console.log(`Simulating deletion of file at path: ${resource.filePath}`);
          // await deleteFile(resource.filePath); // Uncomment if you have actual file deletion logic
        } catch (fileError) {
          console.error('File deletion error (simulated):', fileError);
          // Continue even if file deletion fails, as DB record is gone
        }
      }

      res.json({
        success: true,
        message: 'Resource deleted successfully'
      });
    } catch (error) {
      console.error('Delete resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete resource'
      });
    }
  }
);

/**
 * @route POST /api/resources/:id/download - Track download (Protected)
 * @access Private (authenticated user)
 */
router.post('/:id/download',
  authMiddleware,
  requireDbUserAndAuthorize(), // User must be authenticated to track download
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if resource exists and is accessible
      const resource = await prisma.resource.findUnique({
        where: { id },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          url: true, // Include URL for link types
          isExternal: true, // Include isExternal
          isPrivate: true,
          uploaderId: true
        }
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check if user can access private resource
      // req.dbUser should be available from requireDbUserAndAuthorize
      if (resource.isPrivate && (!req.dbUser || resource.uploaderId !== req.dbUser.id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: This resource is private.'
        });
      }

      // Increment download count
      await prisma.resource.update({
        where: { id },
        data: { downloads: { increment: 1 } }
      });

      // Log download activity
      await prisma.activity.create({
        data: {
          userId: req.dbUser.id, // Use req.dbUser.id
          resourceId: id,
          action: 'DOWNLOAD'
        }
      });

      // Provide the appropriate download URL
      const downloadUrl = resource.isExternal ? resource.url : resource.filePath;

      res.json({
        success: true,
        message: 'Download tracked successfully',
        data: {
          downloadUrl: downloadUrl,
          fileName: resource.fileName || (resource.isExternal ? 'external_link' : 'download')
        }
      });
    } catch (error) {
      console.error('Download tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track download'
      });
    }
  }
);

export default router; // Changed from module.exports = router;
