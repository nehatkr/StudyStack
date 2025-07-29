// backend/src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// --- END NEW SUPABASE AUTH ENDPOINT ---

// Reverted to simple relative paths, assuming 'type: module' in package.json
// and Node.js correctly resolves relative to the current file (server.js in src/)
import resourceRoutes from "./routes/resourceRoutes.js";
import userRoutes from "./routes/userRoutes.js";
// import { authMiddleware } from './middleware/authMiddleware.js';

// Apply Clerk authentication middleware to routes that require it
app.use("/api/resources", ClerkExpressRequireAuth(), resourceRoutes);
app.use("/api/users", ClerkExpressRequireAuth(), userRoutes);

// Error handling middleware for Clerk
app.use((err, req, res, next) => {
  if (err.name === "ClerkExpressRequireAuthError") {
    console.error("Clerk Auth Error:", err);
    return res
      .status(401)
      .json({ message: "Unauthorized: Authentication required." });
  }
  next(err);
});
