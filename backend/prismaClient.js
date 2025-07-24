// backend/prismaClient.js
// This file initializes and exports the Prisma Client.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



// backend/server.js
// This is the main entry point for your Express backend application.

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // Import cors for cross-origin requests
import resourceRoutes from './src/routes/resourceRoutes.js'; // Import resource routes

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; // Use port from environment or default to 5000

// Middleware
app.use(cors()); // Enable CORS for all routes, adjust as needed for production
app.use(express.json()); // Parse JSON request bodies

// Routes
// Mount the resource routes under the /api/resources path
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

// backend/src/routes/resourceRoutes.js
// This file defines the API routes for managing resources.

import { Router } from 'express';
import prisma from '../../prismaClient.js'; // Import the Prisma client

const router = Router();

/**
 * @route POST /api/resources
 * @description Creates a new resource (note, syllabus, PYQ, or external link).
 * @access Public (for now, will be restricted to contributors later)
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
 * uploaderId: string // This will come from authenticated user later
 * }
 */
router.post('/', async (req, res) => {
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
    uploaderId, // Temporary: will be derived from auth in future steps
  } = req.body;

  // Basic validation (more robust validation will be added later)
  if (!title || !description || !subject || !resourceType || !uploaderId) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  // Ensure consistency based on resourceType and isExternal
  if (resourceType === 'LINK' && !url) {
    return res.status(400).json({ message: 'URL is required for LINK type resources.' });
  }
  if (resourceType !== 'LINK' && !filePath) {
    // For file types, filePath (where the file is stored) is crucial
    return res.status(400).json({ message: 'File path is required for file-based resources.' });
  }
  if (resourceType !== 'LINK' && isExternal) {
    // If it's not a link type, it shouldn't be marked as external
    return res.status(400).json({ message: 'isExternal should be false for file-based resources.' });
  }
  if (resourceType === 'LINK' && (!isExternal || filePath || fileName || fileSize || mimeType)) {
    // If it's a link type, it must be external and file-related fields should be absent
    return res.status(400).json({ message: 'Invalid fields for LINK type resource.' });
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
        fileName: resourceType !== 'LINK' ? fileName : null, // Only store for file types
        filePath: resourceType !== 'LINK' ? filePath : null, // Only store for file types
        fileSize: resourceType !== 'LINK' ? fileSize : null, // Only store for file types
        mimeType: resourceType !== 'LINK' ? mimeType : null, // Only store for file types
        url: resourceType === 'LINK' ? url : null, // Only store for link types
        isExternal: resourceType === 'LINK' ? true : false, // Set based on type
        uploader: {
          connect: { id: uploaderId }, // Connect to an existing user
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
