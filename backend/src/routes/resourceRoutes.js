const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorize, checkResourceOwnership } = require('../middleware/authMiddleware');
const { uploadSingle, deleteFile, getFileInfo } = require('../middleware/uploadMiddleware');
const {
  validateResourceCreation,
  validateResourceUpdate,
  validateResourceId,
  validateResourceQuery
} = require('../middleware/validationMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

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
      // If no user is authenticated or user doesn't own the resource
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(403).json({
          success: false,
          message: 'This resource is private'
        });
      }

      // Verify token and check ownership (simplified for this example)
      // In production, you'd want to use the full auth middleware
    }

    // Increment view count
    await prisma.resource.update({
      where: { id },
      data: { views: { increment: 1 } }
    });

    // Log activity if user is authenticated
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        await prisma.activity.create({
          data: {
            userId: decoded.userId,
            resourceId: id,
            action: 'VIEW'
          }
        });
      } catch (error) {
        // Ignore auth errors for view tracking
      }
    }

    // Format response
    const formattedResource = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      fileName: resource.fileName,
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      views: resource.views + 1, // Include the incremented view
      downloads: resource.downloads,
      bookmarks: resource._count.bookmarks,
      allowContact: resource.allowContact,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
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

// POST /api/resources - Upload new resource (Protected)
router.post('/', 
  authenticateToken,
  authorize('CONTRIBUTOR', 'ADMIN'),
  uploadSingle,
  validateResourceCreation,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'File is required'
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
        allowContact = true
      } = req.body;

      const fileInfo = getFileInfo(req.file);

      // Create resource
      const resource = await prisma.resource.create({
        data: {
          title,
          description,
          fileName: fileInfo.originalName,
          filePath: fileInfo.path,
          fileSize: fileInfo.size,
          mimeType: fileInfo.mimetype,
          subject,
          resourceType,
          semester,
          isPrivate,
          allowContact,
          uploaderId: req.user.id
        }
      });

      // Handle tags
      if (tags.length > 0) {
        const tagPromises = tags.map(async (tagName) => {
          // Find or create tag
          const tag = await prisma.tag.upsert({
            where: { name: tagName.toLowerCase().trim() },
            update: {},
            create: { name: tagName.toLowerCase().trim() }
          });

          // Create resource-tag relationship
          return prisma.resourceTag.create({
            data: {
              resourceId: resource.id,
              tagId: tag.id
            }
          });
        });

        await Promise.all(tagPromises);
      }

      // Fetch the created resource with relations
      const createdResource = await prisma.resource.findUnique({
        where: { id: resource.id },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              institution: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        }
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
          tags: createdResource.tags.map(rt => rt.tag.name)
        }
      });
    } catch (error) {
      console.error('Upload resource error:', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await deleteFile(req.file.path);
        } catch (deleteError) {
          console.error('File cleanup error:', deleteError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to upload resource'
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
        allowContact
      } = req.body;

      // Update resource
      const updatedResource = await prisma.resource.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(subject && { subject }),
          ...(semester && { semester }),
          ...(typeof isPrivate === 'boolean' && { isPrivate }),
          ...(typeof allowContact === 'boolean' && { allowContact })
        }
      });

      // Handle tags update if provided
      if (tags && Array.isArray(tags)) {
        // Remove existing tags
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

      // Fetch updated resource with relations
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
          tags: resource.tags.map(rt => rt.tag.name)
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

      // Get resource to find file path
      const resource = await prisma.resource.findUnique({
        where: { id },
        select: { filePath: true }
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Delete resource from database (this will cascade delete related records)
      await prisma.resource.delete({
        where: { id }
      });

      // Delete file from filesystem
      try {
        await deleteFile(resource.filePath);
      } catch (fileError) {
        console.error('File deletion error:', fileError);
        // Continue even if file deletion fails
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

      // Check if resource exists and is accessible
      const resource = await prisma.resource.findUnique({
        where: { id },
        select: {
          id: true,
          filePath: true,
          fileName: true,
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
      if (resource.isPrivate && resource.uploaderId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to private resource'
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
          userId: req.user.id,
          resourceId: id,
          action: 'DOWNLOAD'
        }
      });

      res.json({
        success: true,
        message: 'Download tracked successfully',
        data: {
          downloadUrl: `/uploads/${resource.filePath.split('/').slice(-2).join('/')}`,
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

module.exports = router;