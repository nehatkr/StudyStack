// backend/server.js
// This is the main entry point for your Express backend application.

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // Import cors for cross-origin requests
import resourceRoutes from './src/routes/resourceRoutes.js'; // Import resource routes
// Import the unified authentication and authorization middlewares
import { authMiddleware, requireDbUserAndAuthorize } from './src/middleware/authMiddleware.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; // Use port from environment or default to 5000

// Middleware
app.use(cors()); // Enable CORS for all routes, adjust as needed for production
app.use(express.json()); // Parse JSON request bodies

// Routes
// Apply Clerk's authMiddleware to the /api/resources router.
// The resourceRoutes.js file will then apply requireDbUserAndAuthorize
// and checkResourceOwnership to specific routes as needed.
app.use('/api/resources', authMiddleware, resourceRoutes);

// Basic route for testing server status (no authentication needed here)
app.get('/', (req, res) => {
  res.send('StudyStack Backend API is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}`);
});
