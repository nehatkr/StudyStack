// backend/src/middleware/authMiddleware.js
import prisma from '../../prismaClient.js';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Middleware to ensure user is authenticated via Clerk.
// This directly uses ClerkExpressRequireAuth from Clerk SDK.
export const authenticateToken = ClerkExpressRequireAuth();

// Middleware to fetch DB user and check authorization
// This will run *after* authenticateToken, so req.auth should be populated.
export const authorize = (...allowedRoles) => async (req, res, next) => {
  // ClerkExpressRequireAuth populates req.auth.
  // If req.auth.userId is not available, something went wrong with Clerk auth.
  if (!req.auth || !req.auth.userId) {
    console.error('Authorization Error: Clerk user ID not found after authentication.');
    return res.status(401).json({ message: 'Unauthorized: Authentication failed.' });
  }

  try {
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: req.auth.userId },
    });

    // if (!dbUser) {
    //   console.warn(`User with clerkId ${req.auth.userId} not found in DB during authorization. Attempting to create.`);
    //   // This part is crucial for users who authenticate via Clerk but haven't hit the /supabase-token endpoint yet.
    //   // Fetch user details directly from Clerk SDK.
    //   const clerkUser = await ClerkExpressRequireAuth()._sdk.users.getUser(req.auth.userId);

    //   dbUser = await prisma.user.create({
    //     data: {
    //       clerkId: req.auth.userId,
    //       email: clerkUser.emailAddresses[0]?.emailAddress || 'unknown@example.com',
    //       name: clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || 'User',
    //       role: 'VIEWER', // Default role for newly created users during middleware check
    //       isVerified: clerkUser.emailAddresses[0]?.verification.status === 'verified',
    //     },
    //   });
    //   console.log('New user created in DB during authorization:', dbUser.id);
    // }
// if (!dbUser) {
//       console.warn(`User with clerkId ${req.auth.userId} not found in DB during authorization. Attempting to create.`);
//       const clerkUser = await clerkClient.users.getUser(req.auth.userId); // Use Clerk.users.getUser()
//       dbUser = await prisma.user.create({
//         data: {
//           clerkId: req.auth.userId,
//           email: clerkUser.emailAddresses[0]?.emailAddress || 'unknown@example.com',
//           name: clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || 'User',
//           role: 'VIEWER',
//           isVerified: clerkUser.emailAddresses[0]?.verification.status === 'verified',
//         },
//       });
//       console.log('New user created in DB during authorization:', dbUser.id);
//     }

//     req.user = dbUser; // Attach the database user object to req.user for easier access in routes

//     // Check roles if specified
//     if (allowedRoles.length > 0 && !allowedRoles.includes(dbUser.role)) {
//       console.warn(`Authorization Error: User ${dbUser.id} (${dbUser.role}) tried to access protected route. Required: ${allowedRoles.join(', ')}`);
//       return res.status(403).json({ message: `Forbidden: Insufficient role. Required: ${allowedRoles.join(', ')}` });
//     }

//     next();
//   } catch (error) {
//     console.error('Error in authorize middleware:', error);
//     res.status(500).json({ message: 'Internal server error during authorization check.' });
//   }
// };



    if (!dbUser) {
      console.warn(`User with clerkId ${req.auth.userId} not found in DB during authorization. Attempting to create.`);
      const clerkUser = await Clerk.users.getUser(req.auth.userId);
      console.log('Fetched Clerk User details in authMiddleware:', {
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
      const userName = clerkUser.firstName || primaryEmailObject?.emailAddress?.split('@')[0] || 'User';

      dbUser = await prisma.user.create({
        data: {
          clerkId: req.auth.userId,
          email: emailAddress,
          name: userName,
          role: 'VIEWER',
          isVerified: isEmailVerified,
        },
      });
      console.log('New user created in DB during authorization:', dbUser.id);
    }

    req.user = dbUser;
    if (allowedRoles.length > 0 && !allowedRoles.includes(dbUser.role)) {
      console.warn(`Authorization Error: User ${dbUser.id} (${dbUser.role}) tried to access protected route. Required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ message: `Forbidden: Insufficient role. Required: ${allowedRoles.join(', ')}` });
    }

    next();
  } catch (error) {
    console.error('Error in authorize middleware:', error);
    res.status(500).json({ message: 'Internal server error during authorization check.' });
  }
};

// Middleware to check resource ownership
export const checkResourceOwnership = async (req, res, next) => {
  const { id } = req.params; 
  const userId = req.user?.id; 

  if (!userId) {
    console.error('Ownership Check Error: User ID not found on request object.');
    return res.status(401).json({ message: 'Unauthorized: User ID missing for ownership check.' });
  }

  try {
    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { uploaderId: true }
    });

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    // Allow owner or ADMIN to proceed
    if (resource.uploaderId !== userId && req.user.role !== 'ADMIN') {
      console.warn(`Ownership Check Error: User ${userId} tried to modify resource ${id} (owned by ${resource.uploaderId}). Role: ${req.user.role}`);
      return res.status(403).json({ message: 'Forbidden: You do not own this resource.' });
    }

    next();
  } catch (error) {
    console.error('Error in checkResourceOwnership middleware:', error);
    res.status(500).json({ message: 'Internal server error during ownership check.' });
  }
};
