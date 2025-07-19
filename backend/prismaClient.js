// backend/prismaClient.js
// This file initializes and exports the Prisma Client.

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();


// backend/server.js
// This is the main entry point for your Express backend application.

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // Import cors for cross-origin requests
import resourceRoutes from './src/routes/resourceRoutes.js'; // Import resource routes
import { authMiddleware } from './src/middleware/authMiddleware.js'; // Import the authentication middleware

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; // Use port from environment or default to 5000

// Middleware
app.use(cors()); // Enable CORS for all routes, adjust as needed for production
app.use(express.json()); // Parse JSON request bodies

// Routes
// Mount the resource routes under the /api/resources path
// The POST route will be protected by authMiddleware
app.use('/api/resources', resourceRoutes);

// Basic route for testing server status
app.get('/', (req, res) => {
  res.send('StudyStack Backend API is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}`);
});

// backend/src/middleware/authMiddleware.js
// This middleware will verify Clerk authentication tokens.

import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import prisma from '../../prismaClient.js'; // Import Prisma client to interact with User model

// This middleware requires authentication for routes it's applied to.
// It also populates req.auth and req.user with Clerk user data.
export const authMiddleware = ClerkExpressRequireAuth({
  // Optionally, you can specify options here, e.g., to allow unauthenticated access to some routes
  // or to customize how the user is loaded.
});

// Middleware to ensure the authenticated user exists in your database
// and has the 'CONTRIBUTOR' role for specific actions.
export const requireContributorRole = async (req, res, next) => {
  // ClerkExpressRequireAuth should have populated req.auth and req.user
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
      // You might get more user details from Clerk's API if needed here
      // For simplicity, we'll just create with basic info from auth
      user = await prisma.user.create({
        data: {
          clerkId: req.auth.userId,
          email: req.auth.user.emailAddresses[0].emailAddress, // Assuming primary email
          name: req.auth.user.firstName || req.auth.user.emailAddresses[0].emailAddress, // Use first name or email
          role: 'VIEWER', // Default to VIEWER, can be updated to CONTRIBUTOR later
        },
      });
    }

    // Attach the full user object from your DB to the request for later use
    req.dbUser = user;

    // Check if the user has the CONTRIBUTOR role
    if (user.role !== 'CONTRIBUTOR' && user.role !== 'ADMIN') { // Admin can also upload
      return res.status(403).json({ message: 'Forbidden: Only contributors or admins can perform this action.' });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Error in requireContributorRole middleware:', error);
    res.status(500).json({ message: 'Internal server error during authorization.' });
  }
};


// backend/src/routes/resourceRoutes.js
// This file defines the API routes for managing resources.

import { Router } from 'express';
import prisma from '../../prismaClient.js'; // Import the Prisma client
import { authMiddleware, requireContributorRole } from '../middleware/authMiddleware.js'; // Import authentication and role middleware

const router = Router();

/**
 * @route POST /api/resources
 * @description Creates a new resource (note, syllabus, PYQ, or external link).
 * @access Private (restricted to authenticated contributors)
 * @body {
 * title: string,
 * description: string,
 * subject: string,
 * resourceType: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK',
 * semester?: string,
 * isPrivate?: boolean,
 * allowContact?: boolean,
 * // For file-based resources:
 * fileName?: string,
 * filePath?: string, // This will be the URL/path where the file is stored
 * fileSize?: number,
 * mimeType?: string,
 * // For link-based resources:
 * url?: string,
 * isExternal?: boolean,
 * // uploaderId is now derived from authenticated user
 * }
 */
router.post('/', authMiddleware, requireContributorRole, async (req, res) => {
  // uploaderId is now extracted from the authenticated user via Clerk
  const uploaderId = req.dbUser.id; // Use the ID from your database user object

  const {
    title,
    description,
    subject,
    resourceType,
    semester,
    isPrivate = false,
    allowContact = true,
    fileName,
    filePath,
    fileSize,
    mimeType,
    url,
    isExternal = false,
  } = req.body;

  // Basic validation (more robust validation will be added later)
  if (!title || !description || !subject || !resourceType) {
    return res.status(400).json({ message: 'Missing required fields: title, description, subject, resourceType.' });
  }

  // Ensure consistency based on resourceType and isExternal
  if (resourceType === 'LINK') {
    if (!url) {
      return res.status(400).json({ message: 'URL is required for LINK type resources.' });
    }
    if (filePath || fileName || fileSize || mimeType) {
      return res.status(400).json({ message: 'File-related fields should not be present for LINK type resources.' });
    }
  } else { // For file-based resources
    if (!filePath) {
      return res.status(400).json({ message: 'File path is required for file-based resources.' });
    }
    if (url) {
      return res.status(400).json({ message: 'URL should not be present for file-based resources.' });
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
      },
    });
    res.status(201).json(newResource);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ message: 'Failed to create resource', error: error.message });
  }
});

/**
 * @route GET /api/resources
 * @description Fetches all resources or filters by subject, semester, and resourceType.
 * @access Public
 * @query {subject?: string, semester?: string, resourceType?: string}
 */
router.get('/', async (req, res) => {
  const { subject, semester, resourceType } = req.query;

  const where = {};
  if (subject) {
    where.subject = subject;
  }
  if (semester) {
    where.semester = semester;
  }
  if (resourceType) {
    // Ensure resourceType matches the enum values
    if (['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'OTHER', 'LINK'].includes(resourceType.toUpperCase())) {
      where.resourceType = resourceType.toUpperCase();
    } else {
      return res.status(400).json({ message: 'Invalid resourceType provided.' });
    }
  }

  try {
    const resources = await prisma.resource.findMany({
      where,
      // Include uploader information and tags for display
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Order by newest first
      },
    });
    res.status(200).json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: 'Failed to fetch resources', error: error.message });
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
            allowContact: true, // Include this for the contact feature
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    // Increment view count (optional, can be moved to a dedicated activity logging)
    await prisma.resource.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    res.status(200).json(resource);
  } catch (error) {
    console.error(`Error fetching resource with ID ${id}:`, error);
    res.status(500).json({ message: 'Failed to fetch resource', error: error.message });
  }
});


export default router;
