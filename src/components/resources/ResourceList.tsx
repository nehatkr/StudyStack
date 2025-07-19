import React from 'react';
import { Resource } from '../../types';
import { ResourceCard } from './ResourceCard';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { GlassCard } from '../ui/GlassCard';

interface ResourceListProps {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  onDownload: (resourceId: string) => void;
  onView: (resourceId: string) => void;
}

export const ResourceList: React.FC<ResourceListProps> = ({
  resources,
  loading,
  error,
  onDownload,
  onView,
}) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="resource" count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="text-red-500 dark:text-red-400 mb-2">
          <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-lg font-semibold">{error}</p>
        </div>
      </GlassCard>
    );
  }

  if (resources.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-semibold mb-2">No resources found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onDownload={onDownload}
          onView={onView}
        />
      ))}
    </div>
  );
};