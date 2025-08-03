// project/src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import {
  useUser,
  useAuth as useClerkAuth,
  useSession,
} from '@clerk/clerk-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Please check your .env file.");
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'viewer' | 'contributor' | 'admin';
  avatar?: string;
  institution?: string;
  bio?: string;
  phone?: string;
  contactEmail?: string;
  isVerified: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  supabase: SupabaseClient | null; // Supabase client is now part of the state
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: isClerkUserLoaded } = useUser();
  const { session, isLoaded: isClerkSessionLoaded } = useSession();
  const { getToken: getClerkToken } = useClerkAuth();

  const [user, setUser] = useState<User | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const setupSupabaseClient = async () => {
      // Wait for Clerk's user and session to be fully loaded
      if (!isClerkUserLoaded || !isClerkSessionLoaded) {
        setIsLoading(true);
        return;
      }

      // If the user is logged in via Clerk
      if (clerkUser && session) {
        try {
          setIsLoading(true);

          // Get the Clerk JWT token using the 'supabase' template
          // This token is specifically configured for Supabase authentication
          const clerkJwtToken = await getClerkToken({ template: 'supabase' });

          if (!clerkJwtToken) {
            console.error('Error: Could not get Clerk JWT token for Supabase.');
            throw new Error('Could not get Clerk JWT token for Supabase.');
          }

          console.log('Clerk JWT Token obtained. Initializing Supabase client...');

          // IMPORTANT: Create a new Supabase client and pass the Clerk JWT
          // This uses the Clerk token directly for authentication, bypassing OIDC.
          const newSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
              headers: {
                Authorization: `Bearer ${clerkJwtToken}`,
              },
            },
            auth: {
              // Crucial: Tell the Supabase client to not manage its own session.
              // Clerk is the source of truth for the user's session.
              persistSession: false,
            },
          });
          setSupabase(newSupabaseClient); // Store the new client instance

          // ---- You can now fetch user data from your 'profiles' table if needed ----
          // This example assumes you have a 'profiles' table with a 'user_id'
          // that matches the Clerk user ID (clerkUser.id).
          const { data: dbUser, error: fetchError } = await newSupabaseClient
            .from('profiles')
            .select('*')
            .eq('user_id', clerkUser.id)
            .single();

          if (fetchError) {
            console.error('Error fetching user profile:', fetchError);
            // This is a common point for an initial user creation.
            // If the user doesn't exist, you might create a new profile here.
          }
          
          console.log('Successfully authenticated with Supabase using Clerk JWT.');

          // Map Clerk user data to your local User interface
          const mappedUser: User = {
            id: clerkUser.id,
            name: clerkUser.fullName || clerkUser.emailAddresses[0]?.emailAddress || 'User',
            email: clerkUser.emailAddresses[0]?.emailAddress || 'N/A',
            role: dbUser?.role || 'viewer', // Default role if not found in DB
            avatar: clerkUser.imageUrl,
            institution: dbUser?.institution,
            bio: dbUser?.bio,
            phone: dbUser?.phone,
            contactEmail: dbUser?.contactEmail,
            isVerified: dbUser?.is_verified ?? false,
            createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
            lastLogin: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt) : undefined,
          };
          
          setUser(mappedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Supabase authentication failed:', error);
          // On error, clear all state and handle it gracefully
          setUser(null);
          setSupabase(null);
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        // No Clerk user, or session is not active.
        // Clear all state to log the user out.
        console.log('No active Clerk session. Resetting auth state.');
        setUser(null);
        setSupabase(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    setupSupabaseClient();
  }, [clerkUser, isClerkUserLoaded, isClerkSessionLoaded, session, getClerkToken]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, supabase }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
