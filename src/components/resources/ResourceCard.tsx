import React from 'react';
import { Download, Star, Eye, Calendar, User, FileText, Tag } from 'lucide-react';
import { Resource } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';

interface ResourceCardProps {
  resource: Resource;
  onDownload: (resourceId: string) => void;
  onView: (resourceId: string) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onDownload,
  onView,
}) => {
  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <GlassCard className="p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-white/20 dark:bg-black/20 rounded-lg flex items-center justify-center">
            {getTypeIcon(resource.type)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                {resource.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {resource.description}
              </p>
            </div>
            
            <div className="flex items-center space-x-1 ml-4">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {resource.rating}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(resource.type)}`}>
              {resource.type.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {resource.subject}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(resource.fileSize)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {resource.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-400 rounded-md"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
            {resource.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                +{resource.tags.length - 3} more
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Download className="h-4 w-4" />
                <span>{resource.downloads}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{resource.uploadedAt.toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(resource.id)}
                className="flex items-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>View</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onDownload(resource.id)}
                className="flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};