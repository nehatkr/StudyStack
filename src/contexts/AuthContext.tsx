// project/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, RegisterData } from '../types'; // Import RegisterData from types
import { useClerk, useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  isAuthenticated: boolean | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkIsLoaded, isSignedIn: clerkIsSignedIn } = useUser();
  const clerk = useClerk();
  const { signOut, client } = clerk;
  const { getToken } = useClerkAuth();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Effect to synchronize Clerk's user data with your local user state
  useEffect(() => {
    if (clerkIsLoaded) {
      if (clerkIsSignedIn && clerkUser) {
        // --- START FIX: Robust role mapping ---
        let userRole: 'viewer' | 'contributor' | 'admin' = 'viewer'; // Default to viewer
        if (clerkUser.unsafeMetadata && typeof clerkUser.unsafeMetadata.role === 'string') {
          const roleFromMetadata = clerkUser.unsafeMetadata.role.toLowerCase();
          if (roleFromMetadata === 'contributor') {
            userRole = 'contributor';
          } else if (roleFromMetadata === 'admin') { // Assuming 'admin' is also a possible role
            userRole = 'admin';
          }
          // If it's not 'contributor' or 'admin', it remains 'viewer' (default)
        }
        // --- END FIX ---

        const mappedUser: User = {
          id: clerkUser.id,
          name: clerkUser.fullName || clerkUser.emailAddresses[0]?.emailAddress || 'User',
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          role: userRole, // Use the determined userRole
          avatar: clerkUser.imageUrl,
          institution: (clerkUser.unsafeMetadata?.institution as string) || undefined,
          bio: (clerkUser.unsafeMetadata?.bio as string) || undefined,
          contactInfo: (clerkUser.unsafeMetadata?.contactInfo as { phone?: string; website?: string }) || undefined,
          isVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
          createdAt: new Date(clerkUser.createdAt),
          lastLogin: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt) : undefined,
        };
        setUser(mappedUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }
  }, [clerkIsLoaded, clerkIsSignedIn, clerkUser]);

  const login = async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const res = await client.signIn.create({
        identifier: email,
        password,
        strategy: 'password',
      });
console.log(res);

      if (res.status === 'complete') {
        await clerk.setActive({
          session: res.createdSessionId,
          beforeEmit: () => {},
        });
      } else {
        console.error('Sign-in status:', res.status);
        throw new Error('Sign-in incomplete. Check console for details.');
      }
    } catch (error: any) {
      console.error('Clerk Login Error:', error);
      const errorMessage = error.errors?.[0]?.longMessage || error.message || 'Invalid credentials or network error.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    try {
      const nameParts = userData.name.split(' ').filter(Boolean);
      const firstName = nameParts.length > 0 ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
console.log(userData);

      const res = await client.signUp.create({
        emailAddress: userData.email,
        password: userData.password,
        firstName: firstName,
        lastName: lastName,
         unsafeMetadata: {
          role: userData.role, // Pass the role here initially
          institution: userData.institution,
          bio: userData.bio,
          contactInfo: userData.phone || userData.website ? {
            phone: userData.phone,
            website: userData.website,
          } : undefined,
        },
      });
    
      console.log(res);
      

      if (res.status === 'complete') {
        try {
          // Robust update of unsafeMetadata using res.signUp.update()
          await res.signUp.update({
            unsafeMetadata: {
              ...res.signUp.unsafeMetadata,
              role: userData.role,
            },
          });
          console.log('User role updated via res.signUp.update() in Clerk unsafeMetadata:', userData.role);

        } catch (updateError) {
          console.error('Error updating unsafeMetadata after sign-up:', updateError);
        }

        await clerk.setActive({
          session: res.createdSessionId,
          beforeEmit: () => {},
        });

        // Force a refresh of the Clerk user object to ensure useUser() has latest unsafeMetadata
        if (clerkUser && typeof clerkUser.reload === 'function') {
          await clerkUser.reload();
          console.log('Clerk user object reloaded after metadata update.');
        } else {
          console.warn('clerkUser.reload() not available or not a function.');
        }

      } else if (res.status === 'needs_email_verification') {
        console.log('Sign-up needs email verification. Send email to:', res.emailAddress);
        throw new Error('Account created, but requires email verification. Check your inbox.');
      } else {
        console.error('Sign-up status:', res.status);
        throw new Error('Sign-up incomplete. Check console for details.');
      }
    } catch (error: any) {
      console.error('Clerk Register Error:', error);
      const errorMessage = error.errors?.[0]?.longMessage || error.message || 'Registration failed or network error.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Clerk Logout Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await client.signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });

      if (res.status === 'needs_first_factor') {
        console.log('Password reset email sent. Verification ID:', res.firstFactorVerification.id);
      } else {
        console.error('Forgot password status:', res.status);
        throw new Error('Failed to initiate password reset.');
      }
    } catch (error: any) {
      console.error('Clerk Forgot Password Error:', error);
      const errorMessage = error.errors?.[0]?.longMessage || error.message || 'Failed to send reset email.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (token: string) => {
    setIsLoading(true);
    try {
      console.warn("verifyEmail function needs specific Clerk implementation based on your verification flow.");
      throw new Error("Email verification not fully implemented.");
    } catch (error: any) {
      console.error('Clerk Verify Email Error:', error);
      const errorMessage = error.errors?.[0]?.longMessage || error.message || 'Email verification failed.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    setIsLoading(true);
    try {
      if (!clerkUser) {
        throw new Error("No authenticated user to update.");
      }

      const updatedClerkUser = await clerkUser.update({
        firstName: userData.name?.split(' ')[0],
        lastName: userData.name?.split(' ').slice(1).join(' ') || '',
        imageUrl: userData.avatar || '',
        unsafeMetadata: {
          ...clerkUser.unsafeMetadata,
          role: userData.role,
          institution: userData.institution,
          bio: userData.bio,
          contactInfo: userData.contactInfo,
        },
      });

      console.log('User profile updated via Clerk:', updatedClerkUser);
    } catch (error: any) {
      console.error('Clerk Update Profile Error:', error);
      const errorMessage = error.errors?.[0]?.longMessage || error.message || 'Failed to update profile.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || !clerkIsLoaded,
        isAuthenticated: clerkIsSignedIn,
        login,
        register,
        logout,
        forgotPassword,
        verifyEmail,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
