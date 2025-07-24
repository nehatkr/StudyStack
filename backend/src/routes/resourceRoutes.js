// backend/src/routes/resourceRoutes.js
// This file defines the API routes for managing resources.

import { Router } from 'express';
import prisma from '../../prismaClient.js'; // Import the Prisma client
// Import authentication and role middleware from our shared authMiddleware.js
import { authMiddleware, requireDbUserAndAuthorize, checkResourceOwnership } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @route POST /api/resources
 * @description Creates a new resource (note, syllabus, PYQ, or external link) and updates contributor contact info.
 * @access Private (restricted to authenticated contributors or admins)
 * @body {
 * title: string,
 * description: string,
 * subject: string,
 * resourceType: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ',
 * semester?: string,
 * year?: number, // NEW: Optional year for PYQ
 * isPrivate?: boolean,
 * allowContact?: boolean,
 * phone?: string, // NEW: Optional phone number for contributor
 * contactEmail?: string, // NEW: Optional contact email for contributor
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
  const uploaderId = req.dbUser.id; // Use the ID from your database user object

  const {
    title,
    description,
    subject,
    resourceType,
    semester,
    year,
    isPrivate = false,
    allowContact = true,
    phone, // NEW: Destructure phone
    contactEmail, // NEW: Destructure contactEmail
    fileName,
    filePath,
    fileSize,
    mimeType,
    url,
    isExternal = false,
    tags = [],
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
    if (filePath || fileName || fileSize || mimeType || year) {
      return res.status(400).json({ message: 'File/Year-related fields should not be present for LINK type resources.' });
    }
  } else {
    if (!filePath) {
      return res.status(400).json({ message: 'File path (URL) is required for file-based resources.' });
    }
    if (url) {
      return res.status(400).json({ message: 'URL should not be present for file-based resources.' });
    }
    if (resourceType === 'PYQ' && !year) {
      return res.status(400).json({ message: 'Year is required for PYQ resource type.' });
    }
  }

  try {
    // NEW: Update user's contact info if provided in the upload request
    const updateUserData = {};
    if (phone !== undefined) {
      updateUserData.phone = phone;
    }
    if (contactEmail !== undefined) {
      updateUserData.contactEmail = contactEmail;
    }

    if (Object.keys(updateUserData).length > 0) {
      await prisma.user.update({
        where: { id: uploaderId },
        data: updateUserData,
      });
    }

    const newResource = await prisma.resource.create({
      data: {
        title,
        description,
        subject,
        resourceType,
        semester,
        year: resourceType === 'PYQ' ? year : null,
        isPrivate,
        allowContact,
        fileName: resourceType !== 'LINK' ? fileName : null,
        filePath: resourceType !== 'LINK' ? filePath : null,
        fileSize: resourceType !== 'LINK' ? fileSize : null,
        mimeType: resourceType !== 'LINK' ? mimeType : null,
        url: resourceType === 'LINK' ? url : null,
        isExternal: resourceType === 'LINK' ? true : false,
        uploader: {
          connect: { id: uploaderId },
        },
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
      include: {
        uploader: {
          select: { id: true, name: true, email: true, institution: true, avatar: true, phone: true, contactEmail: true } // NEW: Include phone and contactEmail
        },
        tags: {
          include: { tag: true }
        }
      }
    });

    const formattedResource = {
      id: newResource.id,
      title: newResource.title,
      description: newResource.description,
      subject: newResource.subject,
      resourceType: newResource.resourceType,
      semester: newResource.semester,
      year: newResource.year,
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
        allowContact: newResource.uploader.allowContact, // Assuming allowContact exists on uploader
        phone: newResource.uploader.phone, // NEW: Include phone
        contactEmail: newResource.uploader.contactEmail, // NEW: Include contactEmail
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
    year
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    isPrivate: false,
    ...(subject && { subject: { equals: subject, mode: 'insensitive' } }),
    ...(resourceType && { resourceType: resourceType.toUpperCase() }),
    ...(semester && { semester: { equals: semester, mode: 'insensitive' } }),
    ...(year && !isNaN(parseInt(year)) && { year: parseInt(year) }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: search, mode: 'insensitive' } } } } }
      ]
    })
  };

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
              avatar: true,
              phone: true, // NEW: Include phone
              contactEmail: true // NEW: Include contactEmail
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

    const formattedResources = resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      year: resource.year,
      fileName: resource.fileName,
      filePath: resource.filePath,
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      url: resource.url,
      isExternal: resource.isExternal,
      views: resource.views,
      downloads: resource.downloads,
      bookmarks: resource._count.bookmarks,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
      uploader: {
        id: resource.uploader.id,
        name: resource.uploader.name,
        email: resource.uploader.email,
        allowContact: resource.uploader.allowContact, // Assuming allowContact exists on uploader
        phone: resource.uploader.phone, // NEW: Include phone
        contactEmail: resource.uploader.contactEmail, // NEW: Include contactEmail
      },
      tags: resource.tags.map(rt => rt.tag.name),
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
 * @access Public (but checks authentication for `isBookmarked` and private resources)
 */
router.get('/:id', authMiddleware, async (req, res) => {
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
            contactInfo: true, // This field is not directly on User model in schema.prisma, ensure consistency
            avatar: true,
            phone: true, // NEW: Include phone
            contactEmail: true // NEW: Include contactEmail
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

    if (resource.isPrivate) {
      if (!req.dbUser || resource.uploaderId !== req.dbUser.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: This resource is private.'
        });
      }
    }

    await prisma.resource.update({
      where: { id },
      data: { views: { increment: 1 } }
    });

    if (req.dbUser) {
      try {
        await prisma.activity.create({
          data: {
            userId: req.dbUser.id,
            resourceId: id,
            action: 'VIEW'
          }
        });
      } catch (activityError) {
        console.error('Error logging view activity:', activityError);
      }
    }

    let isBookmarkedByUser = false;
    if (req.dbUser) {
      const bookmark = await prisma.bookmark.findUnique({
        where: {
          userId_resourceId: {
            userId: req.dbUser.id,
            resourceId: id,
          },
        },
      });
      isBookmarkedByUser = !!bookmark;
    }

    const formattedResource = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      fileName: resource.fileName,
      filePath: resource.filePath,
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      url: resource.url,
      isExternal: resource.isExternal,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      year: resource.year,
      views: resource.views + 1,
      downloads: resource.downloads,
      bookmarks: resource._count.bookmarks,
      allowContact: resource.allowContact,
      isPrivate: resource.isPrivate,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
      uploader: {
        id: resource.uploader.id,
        name: resource.uploader.name,
        email: resource.uploader.email,
        allowContact: resource.uploader.allowContact, // Ensure this property is available on uploader
        phone: resource.uploader.phone, // NEW: Include phone
        contactEmail: resource.uploader.contactEmail, // NEW: Include contactEmail
      },
      tags: resource.tags.map(rt => rt.tag.name),
      isBookmarked: isBookmarkedByUser,
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
 * @route POST /api/resources/:id/bookmark - Toggle bookmark status for a resource
 * @access Private (authenticated user)
 */
router.post('/:id/bookmark', authMiddleware, requireDbUserAndAuthorize(), async (req, res) => {
  const { id: resourceId } = req.params;
  const userId = req.dbUser.id;

  try {
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_resourceId: {
          userId: userId,
          resourceId: resourceId,
        },
      },
    });

    let message = '';
    let isBookmarked = false;
    let newBookmarkCount = 0;

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          userId_resourceId: {
            userId: userId,
            resourceId: resourceId,
          },
        },
      });
      const updatedResource = await prisma.resource.update({
        where: { id: resourceId },
        data: { bookmarks: { decrement: 1 } },
      });
      newBookmarkCount = updatedResource.bookmarks;
      message = 'Resource unbookmarked successfully.';
      isBookmarked = false;
    } else {
      await prisma.bookmark.create({
        data: {
          userId: userId,
          resourceId: resourceId,
        },
      });
      const updatedResource = await prisma.resource.update({
        where: { id: resourceId },
        data: { bookmarks: { increment: 1 } },
      });
      newBookmarkCount = updatedResource.bookmarks;
      message = 'Resource bookmarked successfully.';
      isBookmarked = true;

      await prisma.activity.create({
        data: {
          userId: userId,
          resourceId: resourceId,
          action: 'BOOKMARK',
        },
      });
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        resourceId,
        isBookmarked,
        newBookmarkCount,
      },
    });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle bookmark status.', error: error.message });
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
        where: { uploaderId: req.dbUser.id },
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
        where: { uploaderId: req.dbUser.id }
      })
    ]);

    const formattedResources = resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      year: resource.year,
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
  checkResourceOwnership,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        subject,
        semester,
        year,
        tags,
        isPrivate,
        allowContact,
        fileName,
        filePath,
        fileSize,
        mimeType,
        url,
        isExternal,
        phone, // NEW: Destructure phone
        contactEmail // NEW: Destructure contactEmail
      } = req.body;

      const updateData = {
        ...(title && { title }),
        ...(description && { description }),
        ...(subject && { subject }),
        ...(semester && { semester }),
        ...(year && { year }),
        ...(typeof isPrivate === 'boolean' && { isPrivate }),
        ...(typeof allowContact === 'boolean' && { allowContact }),
        ...(fileName && { fileName }),
        ...(filePath && { filePath }),
        ...(fileSize && { fileSize }),
        ...(mimeType && { mimeType }),
        ...(url && { url }),
        ...(typeof isExternal === 'boolean' && { isExternal }),
      };

      // NEW: Update user's contact info if provided in the update request
      const updateUserData = {};
      if (phone !== undefined) {
        updateUserData.phone = phone;
      }
      if (contactEmail !== undefined) {
        updateUserData.contactEmail = contactEmail;
      }

      if (Object.keys(updateUserData).length > 0 && req.dbUser) {
        await prisma.user.update({
          where: { id: req.dbUser.id }, // Update the authenticated user's profile
          data: updateUserData,
        });
      }

      const updatedResource = await prisma.resource.update({
        where: { id },
        data: updateData
      });

      if (tags && Array.isArray(tags)) {
        await prisma.resourceTag.deleteMany({
          where: { resourceId: id }
        });

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

      const resource = await prisma.resource.findUnique({
        where: { id },
        include: {
          uploader: {
            select: { id: true, name: true, email: true, institution: true, avatar: true, phone: true, contactEmail: true } // NEW: Include phone and contactEmail
          },
          tags: {
            include: { tag: true }
          }
        }
      });

      const formattedResource = {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        subject: resource.subject,
        resourceType: resource.resourceType,
        semester: resource.semester,
        year: resource.year,
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
        uploader: {
          id: resource.uploader.id,
          name: resource.uploader.name,
          email: resource.uploader.email,
          allowContact: resource.uploader.allowContact,
          phone: resource.uploader.phone, // NEW: Include phone
          contactEmail: resource.uploader.contactEmail, // NEW: Include contactEmail
        },
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

      const resource = await prisma.resource.findUnique({
        where: { id },
        select: { filePath: true, resourceType: true }
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      await prisma.resource.delete({
        where: { id }
      });

      if (resource.filePath && resource.resourceType !== 'LINK') {
        try {
          console.log(`Simulating deletion of file at path: ${resource.filePath}`);
        } catch (fileError) {
          console.error('File deletion error (simulated):', fileError);
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
  requireDbUserAndAuthorize(),
  async (req, res) => {
    try {
      const { id } = req.params;

      const resource = await prisma.resource.findUnique({
        where: { id },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          url: true,
          isExternal: true,
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

      if (resource.isPrivate && (!req.dbUser || resource.uploaderId !== req.dbUser.id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: This resource is private.'
        });
      }

      await prisma.resource.update({
        where: { id },
        data: { downloads: { increment: 1 } }
      });

      await prisma.activity.create({
        data: {
          userId: req.dbUser.id,
          resourceId: id,
          action: 'DOWNLOAD'
        }
      });

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

export default router;
