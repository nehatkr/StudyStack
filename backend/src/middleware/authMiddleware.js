// backend/src/middleware/authMiddleware.js
// This middleware unifies authentication and authorization using Clerk.

import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import prisma from '../../prismaClient.js'; // Import Prisma client to interact with User model

// 1. Clerk Authentication Middleware
// This middleware requires authentication for routes it's applied to.
// It populates req.auth with Clerk authentication data and req.auth.user with Clerk user data.
export const authMiddleware = ClerkExpressRequireAuth({
  onError: (error) => {
    console.error('Clerk authentication error:', error);
    // You can customize the error response here if needed
    return {
      status: 401,
      message: 'Authentication failed'
    };
  }
});



// 2. Database User Sync & Role Authorization Middleware
// This middleware ensures the authenticated Clerk user exists in your database (syncs on first login),
// attaches your database user object to `req.dbUser`, and performs role-based authorization.
export const requireDbUserAndAuthorize = (...allowedRoles) => {
  return async (req, res, next) => {
    // req.auth and req.auth.user should be populated by ClerkExpressRequireAuth (authMiddleware)
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      // Find the user in your database using the Clerk userId
      let user = await prisma.user.findUnique({
        where: { clerkId: req.auth.userId },
      });

      // If user doesn't exist in your DB, create them (first-time login sync)
      if (!user) {
        // Fetch the user details directly from Clerk's API using the SDK
        // This ensures we get the most up-to-date publicMetadata
        const clerkUserFromAPI = await req.auth.user.reload(); // Reload user data from Clerk API

        const roleFromClerk = clerkUserFromAPI.publicMetadata?.role;
        // Ensure the role is one of your defined roles ('viewer', 'contributor', 'admin')
        const defaultRole = ['viewer', 'contributor', 'admin'].includes(roleFromClerk) ? roleFromClerk.toUpperCase() : 'VIEWER';

        user = await prisma.user.create({
          data: {
            clerkId: clerkUserFromAPI.id, // Use ID from reloaded user
            email: clerkUserFromAPI.emailAddresses[0].emailAddress, // Assuming primary email
            name: clerkUserFromAPI.firstName || clerkUserFromAPI.emailAddresses[0].emailAddress, // Use first name or email
            role: defaultRole, // Use the role from Clerk's publicMetadata or default
          },
        });
      }

      // Attach the full user object from your DB to the request for later use
      req.dbUser = user; // Use req.dbUser consistently for your database user

      // Perform role authorization if specific roles are provided
      if (allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
        }
      }

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error('Error in requireDbUserAndAuthorize middleware:', error);
      res.status(500).json({ message: 'Internal server error during authorization.' });
    }
  };
};

// 3. Resource Ownership Middleware (using req.dbUser)
// This middleware checks if the authenticated user owns the resource or is an admin.
export const checkResourceOwnership = async (req, res, next) => {
  if (!req.dbUser) { // Ensure req.dbUser is populated by requireDbUserAndAuthorize
    return res.status(401).json({ success: false, message: 'Authentication required for ownership check.' });
  }

  try {
    const resourceId = req.params.id;
    const userId = req.dbUser.id; // Use the ID from your database user object

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { uploaderId: true }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Allow modification if user is the uploader or an ADMIN
    if (resource.uploaderId !== userId && req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You can only modify your own resources'
      });
    }

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during ownership verification'
    });
  }
};
