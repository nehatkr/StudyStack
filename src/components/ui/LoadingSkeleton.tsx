import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
  type?: 'card' | 'line' | 'circle' | 'resource';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  count = 1,
  type = 'line',
}) => {
  const baseClasses = "animate-pulse-subtle bg-background-300 rounded-lg";

  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={cn("p-6 space-y-4 bg-card-500 border border-background-300 rounded-lg", className)}>
            <div className="h-6 bg-background-300 rounded-md w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-background-200 rounded w-full"></div>
              <div className="h-4 bg-background-200 rounded w-5/6"></div>
            </div>
            <div className="flex space-x-4">
              <div className="h-4 bg-background-200 rounded w-20"></div>
              <div className="h-4 bg-background-200 rounded w-16"></div>
            </div>
          </div>
        );
      case 'resource':
        return (
          <div className={cn("p-6 space-y-4 bg-card-500 border border-background-300 rounded-lg", className)}>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-background-300 rounded-lg flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-background-300 rounded w-3/4"></div>
                <div className="h-4 bg-background-200 rounded w-full"></div>
                <div className="h-4 bg-background-200 rounded w-2/3"></div>
              </div>
            </div>
            <div className="flex items-center space-x-4 pt-2">
              <div className="h-4 bg-background-200 rounded w-20"></div>
              <div className="h-4 bg-background-200 rounded w-16"></div>
              <div className="h-4 bg-background-200 rounded w-24"></div>
            </div>
          </div>
        );
      case 'circle':
        return (
          <div className={cn("rounded-full", baseClasses, className)}></div>
        );
      default:
        return (
          <div className={cn("h-4", baseClasses, className)}></div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-fade-in">
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};