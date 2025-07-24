// project/src/types/index.ts

// Define the structure of a User object in your application
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'viewer' | 'contributor' | 'admin'; // User's role: 'viewer', 'contributor', or 'admin'
  avatar?: string; // Optional URL to user's avatar
  institution?: string; // Optional: User's institution/organization
  bio?: string; // Optional: User's biography
  phone?: string; // NEW: Optional phone number for contact
  contactEmail?: string; // NEW: Optional email for direct contact (different from login email)
  isVerified: boolean; // Whether the user's email is verified
  createdAt: Date; // Date when the user account was created
  lastLogin?: Date; // Optional: Date of last login
}

// Define the authentication state for the AuthContext
export interface AuthState {
  user: User | null; // The authenticated user object, or null if not authenticated
  isLoading: boolean; // True if authentication state is currently loading
  isAuthenticated: boolean | undefined; // True if a user is authenticated, false otherwise, undefined initially
}

// Define the data structure for user registration
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string; // Used for frontend validation only
  role: 'viewer' | 'contributor'; // The selected role during registration
  institution?: string;
  bio?: string;
  phone?: string; // NEW: Optional phone for registration
  contactEmail?: string; // NEW: Optional contact email for registration
}

// Define the data structure for a resource
export interface Resource {
  id: string;
  title: string;
  description: string;
  subject: string;
  resourceType: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ'; // Added 'PYQ'
  semester?: string;
  year?: number; // NEW: Optional year for resources like PYQs
  isPrivate: boolean;
  allowContact: boolean;
  fileName?: string;
  filePath?: string; // URL or path to the stored file
  fileSize?: number;
  mimeType?: string;
  url?: string;
  isExternal: boolean;
  views: number;
  downloads: number;
  bookmarks: number;
  version: number;
  createdAt: string; // Date string
  updatedAt: string; // Date string
  uploaderId: string;
  uploader: { // Simplified uploader info for display
    id: string;
    name: string;
    email: string; // This is the login email
    allowContact?: boolean;
    phone?: string; // NEW: Phone number from uploader's profile
    contactEmail?: string; // NEW: Contact email from uploader's profile
  };
  tags: { // Tags associated with the resource
    id: string;
    tag: {
      id: string;
      name: string;
    };
  }[];
  isBookmarked?: boolean; // Whether the current user has bookmarked this resource
}

// Define search and filter parameters for resources
export interface SearchFilters {
  query?: string;
  subject?: string;
  semester?: string;
  resourceType?: string;
  year?: number; // NEW: Optional year filter
  sortBy: 'newest' | 'popular' | 'relevance';
}

// Define activity types
export interface Activity {
  id: string;
  type: 'view' | 'download' | 'bookmark' | 'share' | 'upload'; // Added 'upload'
  resourceId: string;
  resourceTitle: string;
  timestamp: string;
}

// Define bookmark type
export interface Bookmark {
  id: string;
  resourceId: string;
  resourceTitle: string;
  timestamp: string;
}

// Define analytics data for contributors
export interface Analytics {
  totalUploads: number;
  totalViews: number;
  totalDownloads: number;
  totalBookmarks: number;
  topResources: Resource[];
}
