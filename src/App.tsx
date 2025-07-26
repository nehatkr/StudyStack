// project/src/App.tsx
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx'; // Ensure .tsx extension
import { Header } from './components/layout/Header.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { ViewerDashboard } from './components/dashboard/ViewerDashboard.tsx';
import { ContributorDashboard } from './components/dashboard/ContributorDashboard.tsx';
import { ResourceViewModal } from './components/resources/ResourceViewModal.tsx';
import { UploadModal } from './components/upload/UploadModal.tsx';
import { useResources } from './hooks/useResources.ts';
import { SearchFilters, Resource } from './types/index.ts';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { PreviousYearPapersPage } from './pages/PreviousYearPapersPage.tsx';

const queryClient = new QueryClient();

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { getToken: getClerkToken } = useClerkAuth();
  const reactQueryClient = useQueryClient();

  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'newest',
  });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'pyq'>('dashboard');
  const [uploadModalInitialResourceType, setUploadModalInitialResourceType] = useState<string | undefined>(undefined);

  const dummyAnalytics = {
    totalUploads: 0, totalViews: 0, totalDownloads: 0, totalBookmarks: 0, topResources: []
  };
  const dummyActivities = [];
  const dummyBookmarks = [];

  const { resources, activities = dummyActivities, bookmarks = dummyBookmarks, analytics = dummyAnalytics, loading, error, refetchResources } = useResources(filters);

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
  };

  const handleUploadClick = (initialResourceType?: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ' | 'SYLLABUS') => {
    setUploadModalInitialResourceType(initialResourceType);
    setIsUploadModalOpen(true);
  };

  const handleUpload = async (data: any) => {
    console.log('Upload data sent to backend:', data);
    try {
      const token = await getClerkToken(); // This is Clerk's token, used for your backend API
      const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Send Clerk token for your backend to verify
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload resource.');
      }

      const result = await response.json();
      console.log('Resource uploaded successfully, backend response:', result);
      reactQueryClient.invalidateQueries(['resources']);
      reactQueryClient.invalidateQueries(['userAnalytics']);
      reactQueryClient.invalidateQueries(['userActivities']);
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleResourceView = (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (resource) {
      setSelectedResource(resource);
      setIsViewModalOpen(true);
      reactQueryClient.invalidateQueries(['resource', resourceId]);
    }
  };

  const handleResourceDownload = async (resourceId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to download resources.');
      return;
    }
    try {
      const token = await getClerkToken();
      const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/resources/${resourceId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initiate download.');
      }

      const result = await response.json();
      console.log('Download initiated:', result.data.downloadUrl);
      window.open(result.data.downloadUrl, '_blank');

      reactQueryClient.invalidateQueries(['resource', resourceId]);
      reactQueryClient.invalidateQueries(['resources']);

    } catch (error: any) {
      console.error('Error downloading resource:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleResourceEdit = (resourceId: string) => {
    console.log('Edit resource:', resourceId);
  };

  const handleBookmarkToggle = async (resourceId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to bookmark resources.');
      return;
    }

    try {
      const token = await getClerkToken();
      const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/resources/${resourceId}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle bookmark.');
      }

      const result = await response.json();
      console.log('Bookmark toggle result:', result);

      reactQueryClient.invalidateQueries(['resource', resourceId]);
      reactQueryClient.invalidateQueries(['resources']);

      setSelectedResource(prev => {
        if (prev && prev.id === resourceId) {
          return {
            ...prev,
            isBookmarked: result.data.isBookmarked,
            bookmarks: result.data.newBookmarkCount,
          };
        }
        return prev;
      });

    } catch (error: any) {
      console.error('Error toggling bookmark:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleShare = (resourceId: string) => {
    console.log('Share resource:', resourceId);
  };

  const getRelatedResources = (resource: Resource) => {
    return resources
      .filter(r =>
        r.id !== resource.id &&
        (r.subject === resource.subject ||
         r.tags.some(tag => resource.tags.map(t => typeof t === 'string' ? t : t.tag.name).includes(typeof tag === 'string' ? tag : tag.tag.name)))
      )
      .slice(0, 5);
  };

  const navigateToPyq = () => {
    setCurrentPage('pyq');
  };

  const navigateToDashboard = () => {
    setCurrentPage('dashboard');
  };


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
        onUploadClick={isAuthenticated && (user?.role === 'contributor' || user?.role === 'admin') ? handleUploadClick : undefined}
        onNavigateToPyq={navigateToPyq}
        onNavigateToDashboard={navigateToDashboard}
        currentPage={currentPage}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
        {isAuthenticated ? (
          currentPage === 'dashboard' ? (
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
                onUploadClick={handleUploadClick}
                onResourceEdit={handleResourceEdit}
              />
            ) : (
              <div className="text-center py-12 animate-scale-in">
                <h2 className="text-2xl font-bold text-black mb-4">Welcome to StudyStack</h2>
                <p className="text-secondary-600">You are signed in, but your role is not recognized. Please contact support.</p>
              </div>
            )
          ) : (
            <PreviousYearPapersPage
              onResourceView={handleResourceView}
              onResourceDownload={handleResourceDownload}
              onBookmarkToggle={handleBookmarkToggle}
            />
          )
        ) : (
          <div className="text-center py-12 animate-scale-in">
            <h2 className="text-2xl font-bold text-black mb-4">Welcome to StudyStack</h2>
            <p className="text-secondary-600">Please sign in to access your dashboard</p>
          </div>
        )}
      </main>

      <Footer />

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
        initialResourceType={uploadModalInitialResourceType as any}
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
