// project/src/pages/PreviousYearPapersPage.tsx
import React, { useState, useEffect } from 'react';
import { useResources } from '../hooks/useResources';
import { SearchFilters, Resource } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { DocumentTextIcon, ArrowDownTrayIcon, BookmarkIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext'; // NEW: Import useAuth
import { UploadModal } from '../components/upload/UploadModal'; // NEW: Import UploadModal

export const PreviousYearPapersPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth(); // Get user role
  const isContributor = isAuthenticated && (user?.role === 'contributor' || user?.role === 'admin');

  const [filters, setFilters] = useState<SearchFilters>({
    resourceType: 'PYQ', // Always filter for PYQs on this page
    sortBy: 'newest',
    query: '',
    year: undefined,
    subject: '',
  });
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // State for UploadModal

  // Fetch resources using the existing useResources hook
  // Only fetch if not a contributor (contributors will see upload form)
  const { resources, loading, error, refetchResources } = useResources(filters);

  // Generate a list of years for the filter (e.g., last 10 years)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
    setYearOptions(years);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, query: e.target.value }));
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, subject: e.target.value }));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yearValue = e.target.value;
    setFilters(prev => ({
      ...prev,
      year: yearValue ? parseInt(yearValue) : undefined,
    }));
  };

  const handleResourceView = (resourceId: string) => {
    console.log('Viewing PYQ:', resourceId);
    // You would typically open the ResourceViewModal here
    // For now, just a console log
  };

  const handleResourceDownload = (resourceId: string) => {
    console.log('Downloading PYQ:', resourceId);
  };

  const handleBookmarkToggle = (resourceId: string) => {
    console.log('Toggling bookmark for PYQ:', resourceId);
  };

  // NEW: Handle PYQ upload from this page
  const handlePyqUpload = async (data: any) => {
    console.log('PYQ Upload data received in PreviousYearPapersPage:', data);
    // In a real app, you would make the API call to your backend here
    // For now, simulate success and then refetch resources for viewers
    // This is a placeholder for the actual API call
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Simulated PYQ upload successful!');
      if (!isContributor) { // Only refetch if it's a viewer's page
        refetchResources(); // Refresh the list for viewers
      }
      setIsUploadModalOpen(false); // Close modal
    } catch (error) {
      console.error('PYQ upload failed:', error);
      // Handle error display
    }
  };

  if (authLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-4 text-lg text-primary-700">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Previous Year Papers</h1>

      {isContributor ? (
        // Contributor View: Upload Section
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Upload a Previous Year Paper</h2>
          <p className="text-gray-600 mb-6">Share your knowledge and contribute to the StudyStack community.</p>
          <Button
            variant="primary"
            className="px-6 py-3 text-lg"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <PlusIcon className="h-6 w-6 mr-2" /> Upload PYQ
          </Button>
        </div>
      ) : (
        // Viewer View: Search & Filter Section
        <>
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="pyq-subject-search"
              label="Search by Subject"
              type="text"
              placeholder="e.g., Mathematics, Physics"
              value={filters.subject || ''}
              onChange={handleSubjectChange}
            />
            <Input
              id="pyq-keyword-search"
              label="Search by Keyword"
              type="text"
              placeholder="e.g., Algebra, Thermodynamics"
              value={filters.query || ''}
              onChange={handleSearchChange}
            />
            <div>
              <label htmlFor="pyq-year-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Year
              </label>
              <select
                id="pyq-year-filter"
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200 ease-in-out"
                value={filters.year || ''}
                onChange={handleYearChange}
              >
                <option value="">All Years</option>
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-lg text-primary-700">Loading previous year papers...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p>Error loading papers: {error.message}</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p>No previous year papers found matching your criteria.</p>
              <p>Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => (
                <Card key={resource.id} className="p-4 flex flex-col justify-between h-full hover:shadow-lg transition-shadow duration-200">
                  <div>
                    <h4 className="font-semibold text-lg text-gray-900 mb-2">{resource.title}</h4>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{resource.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                      <span className="bg-gray-100 px-2 py-1 rounded-full">{resource.subject}</span>
                      {resource.year && <span className="bg-gray-100 px-2 py-1 rounded-full">Year: {resource.year}</span>}
                      <span className="bg-gray-100 px-2 py-1 rounded-full">Type: {resource.resourceType}</span>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="secondary" size="sm" onClick={() => handleResourceView(resource.id)}>
                      <DocumentTextIcon className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button size="sm" onClick={() => handleResourceDownload(resource.id)}>
                      <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Download
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleBookmarkToggle(resource.id)}>
                      <BookmarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Upload Modal for Contributors */}
      {isContributor && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handlePyqUpload} // Pass the specific PYQ upload handler
          initialResourceType="PYQ" // Pre-select PYQ type
        />
      )}
    </div>
  );
};
