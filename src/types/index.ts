// project/src/types.ts

// Define the structure of a User object in your application
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'viewer' | 'contributor' | 'admin'; // User's role: 'viewer', 'contributor', or 'admin'
  avatar?: string; // Optional URL to user's avatar
  institution?: string; // Optional: User's institution/organization
  bio?: string; // Optional: User's biography
  contactInfo?: { // Optional: Contact details
    phone?: string;
    website?: string;
  };
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
  phone?: string;
  website?: string;
}

// Define the data structure for a resource
export interface Resource {
  id: string;
  title: string;
  description: string;
  subject: string;
  resourceType: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK';
  semester?: string;
  year?: number;
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
    email: string;
    allowContact?: boolean;
  };
  tags: { // Tags associated with the resource
    id: string;
    tag: {
      id: string;
      name: string;
    };
  }[];
}

// Define search and filter parameters for resources
export interface SearchFilters {
  query?: string;
  subject?: string;
  semester?: string;
  resourceType?: string;
  year?: number;
  sortBy: 'newest' | 'popular' | 'relevance';
}

// Define activity types
export interface Activity {
  id: string;
  type: 'view' | 'download' | 'bookmark' | 'share';
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
