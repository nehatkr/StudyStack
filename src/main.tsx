// project/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // Your global CSS
import { ClerkProvider } from '@clerk/clerk-react'; // Import ClerkProvider

// Get the Clerk Publishable Key from environment variables
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key from Clerk. Please set VITE_CLERK_PUBLISHABLE_KEY in your .env file.");
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* ClerkProvider MUST wrap everything that uses Clerk hooks or components */}
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {/* Your App component, which internally contains QueryClientProvider and AuthProvider */}
      <App />
    </ClerkProvider>
  </React.StrictMode>,
);
