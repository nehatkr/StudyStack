// project/src/App.tsx
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ViewerDashboard } from './components/dashboard/ViewerDashboard';
import { ContributorDashboard } from './components/dashboard/ContributorDashboard';
import { ResourceViewModal } from './components/resources/ResourceViewModal';
import { AuthModal } from './components/auth/AuthModal';
import { UploadModal } from './components/upload/UploadModal';
import { useResources } from './hooks/useResources';
import { SearchFilters, Resource } from './types';

const queryClient = new QueryClient();

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth(); // Get isAuthenticated and authLoading
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'newest',
  });
  // Initialize isAuthModalOpen to false by default.
  // We'll control its opening explicitly in useEffect.
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const { resources, activities, bookmarks, analytics, loading, error } = useResources(filters);

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
  };

  const handleUpload = (data: any) => {
    console.log('Upload data:', data);
    // In a real app, this would send data to the API
  };

  const handleResourceView = (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (resource) {
      setSelectedResource(resource);
      setIsViewModalOpen(true);
    }
  };

  const handleResourceDownload = (resourceId: string) => {
    console.log('Download resource:', resourceId);
    // In a real app, this would initiate the download
  };

  const handleResourceEdit = (resourceId: string) => {
    console.log('Edit resource:', resourceId);
    // In a real app, this would open edit modal
  };

  const handleBookmarkToggle = (resourceId: string) => {
    console.log('Toggle bookmark:', resourceId);
    // In a real app, this would toggle bookmark status
  };

  const handleShare = (resourceId: string) => {
    console.log('Share resource:', resourceId);
    // In a real app, this would open share modal
  };

  // Get related resources based on category and tags
  const getRelatedResources = (resource: Resource) => {
    return resources
      .filter(r =>
        r.id !== resource.id &&
        (r.category === resource.category ||
         r.tags.some(tag => resource.tags.includes(tag)))
      )
      .slice(0, 5);
  };

  // Effect to control AuthModal visibility based on authentication status
  useEffect(() => {
    // Only open the AuthModal if authentication is NOT loading AND the user is NOT authenticated
    if (!authLoading && !isAuthenticated) {
      setIsAuthModalOpen(true);
    } else if (!authLoading && isAuthenticated) {
      // If authentication is loaded and user IS authenticated, ensure modal is closed
      setIsAuthModalOpen(false);
    }
  }, [isAuthenticated, authLoading]); // Depend on isAuthenticated and authLoading

  // Render a loading state for the entire app while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-500">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
        <p className="ml-4 text-lg text-primary-700">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-500 animate-fade-in">
      <Header
        onSearch={handleSearch}
        onUploadClick={user?.role === 'contributor' ? () => setIsUploadModalOpen(true) : undefined}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
        {isAuthenticated ? ( // Only render dashboards if authenticated
          user?.role === 'viewer' ? (
            <ViewerDashboard
              resources={resources}
              activities={activities}
              bookmarks={bookmarks}
              loading={loading}
              onResourceView={handleResourceView}
              onResourceDownload={handleResourceDownload}
              onBookmarkToggle={handleBookmarkToggle}
            />
          ) : user?.role === 'contributor' ? (
            <ContributorDashboard
              resources={resources.filter(r => r.uploadedBy === user.id)}
              analytics={analytics}
              loading={loading}
              onUploadClick={() => setIsUploadModalOpen(true)}
              onResourceEdit={handleResourceEdit}
            />
          ) : (
            // Fallback if user is authenticated but role is not recognized
            <div className="text-center py-12 animate-scale-in">
              <h2 className="text-2xl font-bold text-black mb-4">Welcome to StudyStack</h2>
              <p className="text-secondary-600">You are signed in, but your role is not recognized. Please contact support.</p>
            </div>
          )
        ) : (
          // Content for unauthenticated users, which will trigger the AuthModal
          <div className="text-center py-12 animate-scale-in">
            <h2 className="text-2xl font-bold text-black mb-4">Welcome to StudyStack</h2>
            <p className="text-secondary-600">Please sign in to access your dashboard</p>
          </div>
        )}
      </main>

      <Footer />

      {/* AuthModal is now conditionally rendered based on isAuthModalOpen */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ResourceViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        resource={selectedResource}
        relatedResources={selectedResource ? getRelatedResources(selectedResource) : []}
        onDownload={handleResourceDownload}
        onBookmark={handleBookmarkToggle}
        onShare={handleShare}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
