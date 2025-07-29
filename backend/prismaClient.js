// backend/prismaClient.js
// This file initializes and exports the Prisma Client.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { clerkClient, ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { createClient } from "@supabase/supabase-js";

// backend/server.js
// This is the main entry point for your Express backend application.

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // Import cors for cross-origin requests
import { Router } from 'express';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001; // Use port from environment or default to 5001

// Middleware
app.use(cors()); // Enable CORS for all routes, adjust as needed for production
app.use(express.json()); // Parse JSON request bodies

// Routes
// Mount the resource routes under the /api/resources path
// app.use('/api/resources', resourceRoutes);

// Basic route for testing server status
app.get('/', (req, res) => {
  res.send('StudyStack Backend API is running!');
});


// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

// --- NEW SUPABASE AUTH ENDPOINT ---
app.post("/api/auth/supabase-token", async (req, res) => {
  const { clerkToken } = req.body;

  if (!clerkToken) {
    return res.status(400).json({ message: "Clerk token is required." });
  }

  try {
    const [header, payload, signature] = clerkToken.split(".");
    const decodedPayload = JSON.parse(
      Buffer.from(payload, "base64").toString()
    );
        const clerkUserId = decodedPayload.sub;
        console.log(`Decoded Clerk User ID: ${clerkUserId}`);


    if (!clerkUserId) {
      return res
        .status(401)
        .json({ message: "Invalid Clerk token: User ID not found." });
    }

    let dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    // if (!dbUser) {
    //  const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
    //   dbUser = await prisma.user.create({
    //     data: {
    //       clerkId: clerkUserId,
    //       email:
    //         clerkUser.emailAddresses[0]?.emailAddress || "unknown@example.com",
    //       name:
    //         clerkUser.firstName ||
    //         clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] ||
    //         "New User",
    //       role: "VIEWER",
    //       isVerified:
    //         clerkUser.emailAddresses[0]?.verification.status === "verified",
    //     },
    //   });
    // }

    // const {
    //   data: { user: supabaseAuthUser },
    //   error: signInError,
    // } = await supabaseAdmin.auth.signInWithIdToken({
    //   provider: "clerk",
    //   token: clerkToken,
    // });

    if (!dbUser) {
      console.log(`User with clerkId ${clerkUserId} not found in custom DB. Attempting to create new user.`);
      // Fetch full Clerk user details using the Clerk SDK
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      console.log('Fetched Clerk User details:', {
        id: clerkUser.id,
        emailAddresses: clerkUser.emailAddresses,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        username: clerkUser.username
      });

      // Safely access email and verification status
      const primaryEmailObject = clerkUser.emailAddresses?.[0];
      const emailAddress = primaryEmailObject?.emailAddress || 'unknown@example.com';
      const isEmailVerified = primaryEmailObject?.verification?.status === 'verified';
      const userName = clerkUser.firstName || primaryEmailObject?.emailAddress?.split('@')[0] || 'New User';

      dbUser = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: emailAddress,
          name: userName,
          role: 'VIEWER', // Default role for new users
          isVerified: isEmailVerified,
        },
      });
      console.log('New user created in Prisma DB:', dbUser.id);
    } else {
      console.log('User found in Prisma DB:', dbUser.id);
    }

    const { data: { user: supabaseAuthUser }, error: signInError } = await supabaseAdmin.auth.signInWithIdToken({
      provider: 'clerk',
      token: clerkToken,
    });

    if (signInError) {
      console.error("Supabase signInWithIdToken error:", signInError);
      return res
        .status(500)
        .json({
          message: "Failed to authenticate with Supabase.",
          error: signInError.message,
        });
    }

    if (!supabaseAuthUser || !supabaseAuthUser.jwt) {
      return res
        .status(500)
        .json({ message: "Supabase did not return a JWT." });
    }
    console.log('Successfully authenticated with Supabase. Supabase User ID:', supabaseAuthUser.id);

    res.json({
      success: true,
      supabaseToken: supabaseAuthUser.jwt,
      dbUser: {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        institution: dbUser.institution,
        bio: dbUser.bio,
        phone: dbUser.phone,
        contactEmail: dbUser.contactEmail,
        isVerified: dbUser.isVerified,
        createdAt: dbUser.createdAt,
        lastLogin: dbUser.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error exchanging Clerk token for Supabase token:", error);
    res
      .status(500)
      .json({
        message: "Internal server error during token exchange.",
        error: error.message,
      });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}`);
});

// backend/src/routes/resourceRoutes.js
// This file defines the API routes for managing resources.

const  router = Router();

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
