const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users/stats - Get user statistics (Protected)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's resource statistics
    const resourceStats = await prisma.resource.aggregate({
      where: { uploaderId: userId },
      _count: { id: true },
      _sum: {
        views: true,
        downloads: true
      }
    });

    // Get user's activity count
    const activityCount = await prisma.activity.count({
      where: { userId }
    });

    // Get user's bookmark count
    const bookmarkCount = await prisma.bookmark.count({
      where: { userId }
    });

    // Get recent activities
    const recentActivities = await prisma.activity.findMany({
      where: { userId },
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            subject: true,
            resourceType: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        resources: {
          total: resourceStats._count.id || 0,
          totalViews: resourceStats._sum.views || 0,
          totalDownloads: resourceStats._sum.downloads || 0
        },
        activities: activityCount,
        bookmarks: bookmarkCount,
        recentActivities: recentActivities.map(activity => ({
          id: activity.id,
          action: activity.action,
          timestamp: activity.timestamp,
          resource: activity.resource
        }))
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// GET /api/users/bookmarks - Get user's bookmarks (Protected)
router.get('/bookmarks', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      userId: req.user.id,
      ...(category && { category })
    };

    const [bookmarks, totalCount] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          resource: {
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
          }
        }
      }),
      prisma.bookmark.count({ where })
    ]);

    const formattedBookmarks = bookmarks.map(bookmark => ({
      id: bookmark.id,
      category: bookmark.category,
      createdAt: bookmark.createdAt,
      resource: {
        id: bookmark.resource.id,
        title: bookmark.resource.title,
        description: bookmark.resource.description,
        subject: bookmark.resource.subject,
        resourceType: bookmark.resource.resourceType,
        fileSize: bookmark.resource.fileSize,
        views: bookmark.resource.views,
        downloads: bookmark.resource.downloads,
        createdAt: bookmark.resource.createdAt,
        uploader: bookmark.resource.uploader,
        tags: bookmark.resource.tags.map(rt => rt.tag.name)
      }
    }));

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        bookmarks: formattedBookmarks,
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
    console.error('Get bookmarks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookmarks'
    });
  }
});

// POST /api/users/bookmarks - Add bookmark (Protected)
router.post('/bookmarks', authenticateToken, async (req, res) => {
  try {
    const { resourceId, category = 'general' } = req.body;

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required'
      });
    }

    // Check if resource exists
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, title: true }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if bookmark already exists
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_resourceId: {
          userId: req.user.id,
          resourceId
        }
      }
    });

    if (existingBookmark) {
      return res.status(400).json({
        success: false,
        message: 'Resource already bookmarked'
      });
    }

    // Create bookmark
    const bookmark = await prisma.bookmark.create({
      data: {
        userId: req.user.id,
        resourceId,
        category
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        resourceId,
        action: 'BOOKMARK'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Resource bookmarked successfully',
      data: {
        id: bookmark.id,
        category: bookmark.category,
        createdAt: bookmark.createdAt,
        resource: {
          id: resource.id,
          title: resource.title
        }
      }
    });
  } catch (error) {
    console.error('Add bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add bookmark'
    });
  }
});

// DELETE /api/users/bookmarks/:id - Remove bookmark (Protected)
router.delete('/bookmarks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if bookmark exists and belongs to user
    const bookmark = await prisma.bookmark.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: 'Bookmark not found'
      });
    }

    // Delete bookmark
    await prisma.bookmark.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Bookmark removed successfully'
    });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove bookmark'
    });
  }
});

// GET /api/users/activities - Get user's activities (Protected)
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      userId: req.user.id,
      ...(action && { action })
    };

    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take,
        orderBy: { timestamp: 'desc' },
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              subject: true,
              resourceType: true,
              uploader: {
                select: {
                  name: true,
                  institution: true
                }
              }
            }
          }
        }
      }),
      prisma.activity.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        activities: activities.map(activity => ({
          id: activity.id,
          action: activity.action,
          timestamp: activity.timestamp,
          resource: activity.resource
        })),
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
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities'
    });
  }
});

// GET /api/users/analytics - Get user's analytics (Contributors only)
router.get('/analytics', 
  authenticateToken, 
  authorize('CONTRIBUTOR', 'ADMIN'), 
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default: // 30d
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get resource performance
      const resources = await prisma.resource.findMany({
        where: { uploaderId: userId },
        select: {
          id: true,
          title: true,
          views: true,
          downloads: true,
          createdAt: true,
          _count: {
            select: {
              bookmarks: true
            }
          }
        },
        orderBy: { views: 'desc' }
      });

      // Get activities in period
      const activities = await prisma.activity.findMany({
        where: {
          resource: {
            uploaderId: userId
          },
          timestamp: {
            gte: startDate
          }
        },
        select: {
          action: true,
          timestamp: true,
          resourceId: true
        }
      });

      // Group activities by date
      const dailyStats = {};
      activities.forEach(activity => {
        const date = activity.timestamp.toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { views: 0, downloads: 0, bookmarks: 0 };
        }
        dailyStats[date][activity.action.toLowerCase()]++;
      });

      // Convert to array format
      const dailyData = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats
      })).sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate totals
      const totalViews = resources.reduce((sum, r) => sum + r.views, 0);
      const totalDownloads = resources.reduce((sum, r) => sum + r.downloads, 0);
      const totalBookmarks = resources.reduce((sum, r) => sum + r._count.bookmarks, 0);

      res.json({
        success: true,
        data: {
          overview: {
            totalResources: resources.length,
            totalViews,
            totalDownloads,
            totalBookmarks,
            engagementRate: totalViews > 0 ? ((totalDownloads / totalViews) * 100).toFixed(2) : 0
          },
          topResources: resources.slice(0, 5).map(resource => ({
            id: resource.id,
            title: resource.title,
            views: resource.views,
            downloads: resource.downloads,
            bookmarks: resource._count.bookmarks,
            createdAt: resource.createdAt
          })),
          dailyStats: dailyData,
          period
        }
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics'
      });
    }
  }
);

module.exports = router;