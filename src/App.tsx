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
import { PreviousYearPapersPage } from './pages/PreviousYearPapersPage'; // NEW: Import PYQ page
import { useResources } from './hooks/useResources';
import { SearchFilters, Resource } from './types';

const queryClient = new QueryClient();

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'newest',
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'pyq'>('dashboard'); // NEW: State for current page

  // Dummy data for analytics and activities for initial render
  const dummyAnalytics = {
    totalUploads: 0, totalViews: 0, totalDownloads: 0, totalBookmarks: 0, topResources: []
  };
  const dummyActivities = [];
  const dummyBookmarks = [];

  const { resources, activities = dummyActivities, bookmarks = dummyBookmarks, analytics = dummyAnalytics, loading, error } = useResources(filters);

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

  const getRelatedResources = (resource: Resource) => {
    return resources
      .filter(r =>
        r.id !== resource.id &&
        (r.subject === resource.subject ||
         r.tags.some(tag => resource.tags.map(t => t.tag.name).includes(tag.tag.name)))
      )
      .slice(0, 5);
  };

  // Effect to control AuthModal visibility based on authentication status
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setIsAuthModalOpen(true);
    } else if (!authLoading && isAuthenticated) {
      setIsAuthModalOpen(false);
    }
  }, [isAuthenticated, authLoading]);

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
        onUploadClick={isAuthenticated && user?.role === 'contributor' ? () => setIsUploadModalOpen(true) : undefined}
        onNavigateToPyq={() => setCurrentPage('pyq')} // NEW: Pass navigation function
        onNavigateToDashboard={() => setCurrentPage('dashboard')} // NEW: Pass navigation function
        currentPage={currentPage} // NEW: Pass current page for active styling
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
        {isAuthenticated ? (
          currentPage === 'dashboard' ? ( // Conditional rendering based on currentPage state
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
            ) : user?.role === 'contributor' || user?.role === 'admin' ? (
              <ContributorDashboard
                resources={resources.filter(r => r.uploaderId === user.id)}
                analytics={analytics}
                loading={loading}
                onUploadClick={() => setIsUploadModalOpen(true)}
                onResourceEdit={handleResourceEdit}
              />
            ) : (
              <div className="text-center py-12 animate-scale-in">
                <h2 className="text-2xl font-bold text-black mb-4">Welcome to StudyStack</h2>
                <p className="text-secondary-600">You are signed in, but your role is not recognized. Please contact support.</p>
              </div>
            )
          ) : currentPage === 'pyq' ? ( // Render PYQ page
            <PreviousYearPapersPage />
          ) : null // Fallback for unknown page state
        ) : (
          <div className="text-center py-12 animate-scale-in">
            <h2 className="text-2xl font-bold text-black mb-4">Welcome to StudyStack</h2>
            <p className="text-secondary-600">Please sign in to access your dashboard</p>
          </div>
        )}
      </main>

      <Footer />

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
