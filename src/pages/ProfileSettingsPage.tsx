// project/src/pages/ProfileSettingsPage.tsx
import React from 'react';
import { UserProfile } from '@clerk/clerk-react'; // Import Clerk's UserProfile component

export const ProfileSettingsPage: React.FC = () => {
  return (
    <div className="flex justify-center py-8 px-4 sm:px-6 lg:px-8 bg-background-500 min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Profile Settings</h1>
        <p className="text-center text-gray-600 mb-8">Manage your personal information, account settings, and security preferences.</p>
        
        {/* Clerk's UserProfile component provides all the necessary UI and functionality */}
        {/* It handles profile picture, name, email, password, connected accounts, etc. */}
        <UserProfile 
          path="/settings" 
          routing="path" 
          // Adding a basic appearance prop to ensure it renders with some default styling
          appearance={{
            elements: {
              rootBox: "w-full", // Ensure it takes full width of its container
              card: "shadow-none border border-gray-200 rounded-lg p-6 w-full", // Basic card styling
            },
          }}
        /> 
        {/* - path="/settings": This tells Clerk that this UserProfile instance is mounted at the /settings route.
            It's important for Clerk's internal routing within the UserProfile component.
          - routing="path": Ensures Clerk uses path-based routing for its internal navigation.
        */}
      </div>
    </div>
  );
};
