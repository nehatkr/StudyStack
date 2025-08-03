// backend/src/routes/resourceRoutes.js
// This file defines the API routes for managing resources.

import { Router } from 'express'; // Use import for express Router
import prisma from '../../prismaClient.js'; // Correct ESM import for Prisma Client
import jwt from 'jsonwebtoken'; // Correct ESM import for jsonwebtoken

// Import your middleware files using ESM syntax
import { authenticateToken, authorize, checkResourceOwnership } from '../middleware/authMiddleware.js';
import { uploadSingle, deleteFile, getFileInfo } from '../middleware/uploadMiddleware.js';
import {
  validateResourceCreation,
  validateResourceUpdate,
  validateResourceId,
  validateResourceQuery
} from '../middleware/validationMiddleware.js';

const router = Router(); // Correctly declare router with 'const'

// REMOVE THIS LINE: prisma is imported from prismaClient.js
// prisma = new PrismaClient();

// REMOVE THIS LINE: This is for CommonJS exports
// module.exports = router;

// GET /api/resources - Get all resources with filtering and pagination
router.get('/', validateResourceQuery, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      subject,
      resourceType,
      semester,
      search,
      sortBy = 'newest'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      isPrivate: false, // Only show public resources
      ...(subject && { subject }),
      ...(resourceType && { resourceType }),
      ...(semester && { semester }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
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
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get resources with pagination
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
      fileSize: resource.fileSize,
      views: resource.views,
      downloads: resource.downloads,
      bookmarks: resource._count.bookmarks,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      uploader: resource.uploader,
      tags: resource.tags.map(rt => rt.tag.name),
      allowContact: resource.allowContact,
      url: resource.url,
      isExternal: resource.isExternal,
      year: resource.year
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

// GET /api/resources/:id - Get single resource details
router.get('/:id', validateResourceId, async (req, res) => {
  try {
    const { id } = req.params;

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
            phone: true,
            website: true,
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
    if (resource.isPrivate) {
      if (!req.user || resource.uploaderId !== req.user.id) {
         return res.status(403).json({
           success: false,
           message: 'Access denied to private resource'
         });
      }
    }

    // Increment view count
    await prisma.resource.update({
      where: { id },
      data: { views: { increment: 1 } }
    });

    // Log activity if user is authenticated
    if (req.user?.id) {
      try {
        await prisma.activity.create({
          data: {
            userId: req.user.id,
            resourceId: id,
            action: 'VIEW'
          }
        });
      } catch (error) {
        console.error('Activity logging error:', error);
      }
    }

    // Format response
    const formattedResource = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      fileName: resource.fileName,
      filePath: resource.filePath,
      mimeType: resource.mimeType,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      views: resource.views + 1,
      downloads: resource.downloads,
      bookmarks: resource._count.bookmarks,
      allowContact: resource.allowContact,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      uploader: resource.uploader,
      tags: resource.tags.map(rt => rt.tag.name),
      url: resource.url,
      isExternal: resource.isExternal,
      year: resource.year
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

// POST /api/resources - Upload new resource (Protected)
router.post('/',
  authenticateToken,
  authorize('CONTRIBUTOR', 'ADMIN'),
  uploadSingle,
  validateResourceCreation,
  async (req, res) => {
    try {
      const isLinkType = req.body.resourceType === 'LINK';

      if (!isLinkType && !req.file) {
        return res.status(400).json({
          success: false,
          message: 'File is required for non-LINK resource types.'
        });
      }

      const {
        title,
        description,
        subject,
        resourceType,
        semester,
        tags = [],
        isPrivate = false,
        allowContact = true,
        url,
        year
      } = req.body;

      let fileName = null;
      let filePath = null;
      let fileSize = null;
      let mimeType = null;
      let isExternal = false;
      let resourceUrl = null;

      if (isLinkType) {
        if (!url) {
          return res.status(400).json({ success: false, message: 'URL is required for LINK resource type.' });
        }
        resourceUrl = url;
        isExternal = true;
        mimeType = 'text/uri-list';
      } else {
        if (!req.file) {
          return res.status(400).json({ success: false, message: 'File is required for file-based resource types.' });
        }
        const fileInfo = getFileInfo(req.file);

        fileName = fileInfo.originalName;
        filePath = fileInfo.path;
        fileSize = fileInfo.size;
        mimeType = fileInfo.mimetype;
        isExternal = false;
      }

      const resource = await prisma.resource.create({
        data: {
          title,
          description,
          fileName,
          filePath,
          fileSize,
          mimeType,
          subject,
          resourceType,
          semester,
          year: resourceType === 'PYQ' ? parseInt(year) : null,
          isPrivate,
          allowContact,
          url: resourceUrl,
          isExternal,
          uploader: {
            connect: { id: req.user.id },
          },
        },
      });

      if (tags.length > 0) {
        const tagPromises = tags.map(async (tagName) => {
          const tag = await prisma.tag.upsert({
            where: { name: tagName.toLowerCase().trim() },
            update: {},
            create: { name: tagName.toLowerCase().trim() },
          });
          return prisma.resourceTag.create({
            data: {
              resourceId: resource.id,
              tagId: tag.id,
            },
          });
        });
        await Promise.all(tagPromises);
      }

      const createdResource = await prisma.resource.findUnique({
        where: { id: resource.id },
        include: {
          uploader: {
            select: { id: true, name: true, institution: true },
          },
          tags: {
            include: { tag: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Resource uploaded successfully',
        data: {
          id: createdResource.id,
          title: createdResource.title,
          description: createdResource.description,
          subject: createdResource.subject,
          resourceType: createdResource.resourceType,
          semester: createdResource.semester,
          fileSize: createdResource.fileSize,
          isPrivate: createdResource.isPrivate,
          allowContact: createdResource.allowContact,
          createdAt: createdResource.createdAt,
          uploader: createdResource.uploader,
          tags: createdResource.tags.map((rt) => rt.tag.name),
          url: createdResource.url,
          isExternal: createdResource.isExternal,
          year: createdResource.year,
        },
      });
    } catch (error) {
      console.error('Upload resource error:', error);

      if (req.file && req.file.path && !req.body.resourceType === 'LINK') {
        try {
          await deleteFile(req.file.path);
        } catch (deleteError) {
          console.error('File cleanup error during rollback:', deleteError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to upload resource',
        error: error.message,
      });
    }
  }
);


// GET /api/my-resources - Get user's uploaded resources (Protected)
router.get('/my/resources', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [resources, totalCount] = await Promise.all([
      prisma.resource.findMany({
        where: { uploaderId: req.user.id },
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
        where: { uploaderId: req.user.id }
      })
    ]);

    const formattedResources = resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      fileSize: resource.fileSize,
      views: resource.views,
      downloads: resource.downloads,
      bookmarks: resource._count.bookmarks,
      isPrivate: resource.isPrivate,
      allowContact: resource.allowContact,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      tags: resource.tags.map(rt => rt.tag.name),
      url: resource.url,
      isExternal: resource.isExternal,
      year: resource.year
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

// PUT /api/resources/:id - Update resource (Protected, Owner only)
router.put('/:id',
  authenticateToken,
  authorize('CONTRIBUTOR', 'ADMIN'),
  validateResourceId,
  checkResourceOwnership,
  validateResourceUpdate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        subject,
        semester,
        tags,
        isPrivate,
        allowContact,
        year
      } = req.body;

      const updatedResource = await prisma.resource.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(subject && { subject }),
          ...(semester && { semester }),
          ...(typeof isPrivate === 'boolean' && { isPrivate }),
          ...(typeof allowContact === 'boolean' && { allowContact }),
          ...(year && { year: parseInt(year) })
        }
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
          tags: {
            include: {
              tag: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Resource updated successfully',
        data: {
          id: resource.id,
          title: resource.title,
          description: resource.description,
          subject: resource.subject,
          resourceType: resource.resourceType,
          semester: resource.semester,
          isPrivate: resource.isPrivate,
          allowContact: resource.allowContact,
          updatedAt: resource.updatedAt,
          tags: resource.tags.map(rt => rt.tag.name),
          url: resource.url,
          isExternal: resource.isExternal,
          year: resource.year
        }
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

// DELETE /api/resources/:id - Delete resource (Protected, Owner only)
router.delete('/:id',
  authenticateToken,
  authorize('CONTRIBUTOR', 'ADMIN'),
  validateResourceId,
  checkResourceOwnership,
  async (req, res) => {
    try {
      const { id } = req.params;

      const resource = await prisma.resource.findUnique({
        where: { id },
        select: { filePath: true, isExternal: true }
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

      if (resource.filePath && !resource.isExternal) {
        try {
          const parts = resource.filePath.split('/public/resources/');
          if (parts.length > 1) {
            const pathInBucket = parts[1];
            // supabaseAdmin is not defined in this scope. Need to pass it or import.
            // This will be fixed by passing supabaseAdmin to resourceRoutes.
            const { error: storageError } = supabaseAdmin.storage
              .from('resources')
              .remove([pathInBucket]);

            if (storageError) {
              console.error('Supabase Storage deletion error:', storageError);
              throw new Error(`Failed to delete file from storage: ${storageError.message}`);
            }
            console.log(`Successfully deleted file from Supabase Storage: ${pathInBucket}`);
          } else {
            console.warn('Could not parse Supabase Storage path from filePath:', resource.filePath);
          }
        } catch (fileError) {
          console.error('File deletion error:', fileError);
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

// POST /api/resources/:id/download - Track download (Protected)
router.post('/:id/download',
  authenticateToken,
  validateResourceId,
  async (req, res) => {
    try {
      const { id } = req.params;

      const resource = await prisma.resource.findUnique({
        where: { id },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          isPrivate: true,
          uploaderId: true,
          isExternal: true,
          url: true
        }
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      if (resource.isPrivate && resource.uploaderId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to private resource'
        });
      }

      await prisma.resource.update({
        where: { id },
        data: { downloads: { increment: 1 } }
      });

      await prisma.activity.create({
        data: {
          userId: req.user.id,
          resourceId: id,
          action: 'DOWNLOAD'
        }
      });

      let downloadUrl;
      if (resource.isExternal && resource.url) {
        downloadUrl = resource.url;
      } else if (resource.filePath) {
        // supabaseAdmin is not defined in this scope. Need to pass it or import.
        // This will be fixed by passing supabaseAdmin to resourceRoutes.
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('resources')
          .getPublicUrl(resource.filePath);

        if (publicUrlData?.publicUrl) {
          downloadUrl = publicUrlData.publicUrl;
        } else {
          throw new Error('Could not get public URL for file.');
        }
      } else {
        throw new Error('No valid file path or URL for download.');
      }

      res.json({
        success: true,
        message: 'Download tracked successfully',
        data: {
          downloadUrl: downloadUrl,
          fileName: resource.fileName
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

// POST /api/resources/:id/bookmark - Toggle bookmark (Protected)
router.post('/:id/bookmark',
  authenticateToken,
  validateResourceId,
  async (req, res) => {
    try {
      const { id: resourceId } = req.params;
      const userId = req.user.id;

      const existingBookmark = await prisma.bookmark.findUnique({
        where: {
          userId_resourceId: {
            userId: userId,
            resourceId: resourceId
          }
        }
      });

      let isBookmarked;
      let newBookmarkCount;

      if (existingBookmark) {
        await prisma.bookmark.delete({
          where: { id: existingBookmark.id }
        });
        isBookmarked = false;
        await prisma.resource.update({
          where: { id: resourceId },
          data: { bookmarks: { decrement: 1 } }
        });
      } else {
        await prisma.bookmark.create({
          data: {
            userId: userId,
            resourceId: resourceId
          }
        });
        isBookmarked = true;
        await prisma.resource.update({
          where: { id: resourceId },
          data: { bookmarks: { increment: 1 } }
        });
      }

      const updatedResource = await prisma.resource.findUnique({
        where: { id: resourceId },
        select: { bookmarks: true }
      });
      newBookmarkCount = updatedResource ? updatedResource.bookmarks : 0;

      await prisma.activity.create({
        data: {
          userId: userId,
          resourceId: resourceId,
          action: isBookmarked ? 'BOOKMARK_ADD' : 'BOOKMARK_REMOVE'
        }
      });

      res.json({
        success: true,
        message: `Resource ${isBookmarked ? 'bookmarked' : 'unbookmarked'} successfully`,
        data: {
          isBookmarked: isBookmarked,
          newBookmarkCount: newBookmarkCount
        }
      });

    } catch (error) {
      console.error('Bookmark toggle error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle bookmark'
      });
    }
  }
);

export default router;
