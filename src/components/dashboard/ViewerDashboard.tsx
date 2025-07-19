import React, { useState } from 'react';
import { BookOpen, Download, Bookmark, Clock, Search, Filter, Star, Eye } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { Resource, Activity, Bookmark as BookmarkType } from '../../types';

interface ViewerDashboardProps {
  resources: Resource[];
  activities: Activity[];
  bookmarks: BookmarkType[];
  loading: boolean;
  onResourceView: (resourceId: string) => void;
  onResourceDownload: (resourceId: string) => void;
  onBookmarkToggle: (resourceId: string) => void;
}

export const ViewerDashboard: React.FC<ViewerDashboardProps> = ({
  resources,
  activities,
  bookmarks,
  loading,
  onResourceView,
  onResourceDownload,
  onBookmarkToggle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'computer-science', 'mathematics', 'physics', 'chemistry', 'biology'];

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const recentActivities = activities.slice(0, 10);
  const bookmarkedResources = resources.filter(resource => 
    bookmarks.some(bookmark => bookmark.resourceId === resource.id)
  );

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'doc':
        return '📝';
      case 'ppt':
        return '📊';
      default:
        return '📁';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <Card className="p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black mb-2">Welcome back!</h1>
            <p className="text-secondary-600">Discover and access educational resources</p>
          </div>
          <div className="flex items-center space-x-6 text-center">
            <div>
              <div className="text-2xl font-bold text-secondary-600">{resources.length}</div>
              <div className="text-sm text-secondary-500">Resources</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent-600">{bookmarks.length}</div>
              <div className="text-sm text-secondary-500">Bookmarked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-600">{activities.length}</div>
              <div className="text-sm text-secondary-500">Activities</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search and Filters */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-card-500 border border-background-400 rounded-lg text-black focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="all">All Categories</option>
                  <option value="computer-science">Computer Science</option>
                  <option value="mathematics">Mathematics</option>
                  <option value="physics">Physics</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="biology">Biology</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {filteredResources.map((resource) => (
              <Card key={resource.id} variant="interactive" className="p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl">{getTypeIcon(resource.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-black mb-1 line-clamp-1">
                      {resource.title}
                    </h3>
                    <p className="text-sm text-secondary-600 mb-3 line-clamp-2">
                      {resource.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-secondary-500 mb-4">
                      <span>{resource.category}</span>
                      <span>•</span>
                      <span>{formatFileSize(resource.fileSize)}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{resource.views}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onResourceView(resource.id)}
                        >
                          View
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onResourceDownload(resource.id)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onBookmarkToggle(resource.id)}
                        className={bookmarks.some(b => b.resourceId === resource.id) ? 'text-accent-600' : ''}
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredResources.length === 0 && (
            <Card className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No resources found</h3>
              <p className="text-secondary-600">Try adjusting your search or filters</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <h3 className="font-semibold text-black mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivities.map((activity) => {
                const resource = resources.find(r => r.id === activity.resourceId);
                if (!resource) return null;
                
                return (
                  <div key={activity.id} className="flex items-center space-x-3 p-2 hover:bg-background-100 rounded-lg transition-colors">
                    <div className="text-lg">{getTypeIcon(resource.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black line-clamp-1">
                        {resource.title}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {activity.action} • {activity.timestamp.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Bookmarks */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <h3 className="font-semibold text-black mb-4 flex items-center">
              <Bookmark className="h-5 w-5 mr-2" />
              Bookmarks ({bookmarks.length})
            </h3>
            <div className="space-y-3">
              {bookmarkedResources.slice(0, 5).map((resource) => (
                <div key={resource.id} className="flex items-center space-x-3 p-2 hover:bg-background-100 rounded-lg transition-colors cursor-pointer">
                  <div className="text-lg">{getTypeIcon(resource.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black line-clamp-1">
                      {resource.title}
                    </p>
                    <p className="text-xs text-secondary-500">
                      {resource.category}
                    </p>
                  </div>
                </div>
              ))}
              {bookmarkedResources.length === 0 && (
                <p className="text-sm text-secondary-500 text-center py-4">
                  No bookmarks yet
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};