import React, { useState } from 'react';
import { Upload, BarChart3, Eye, Download, TrendingUp, Users, FileText, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { Resource, Analytics } from '../../types';

interface ContributorDashboardProps {
  resources: Resource[];
  analytics: Analytics[];
  loading: boolean;
  onUploadClick: () => void;
  onResourceEdit: (resourceId: string) => void;
}

export const ContributorDashboard: React.FC<ContributorDashboardProps> = ({
  resources,
  analytics,
  loading,
  onUploadClick,
  onResourceEdit,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Mock analytics data
  const mockDailyViews = [
    { date: '2024-01-01', views: 45 },
    { date: '2024-01-02', views: 52 },
    { date: '2024-01-03', views: 38 },
    { date: '2024-01-04', views: 67 },
    { date: '2024-01-05', views: 71 },
    { date: '2024-01-06', views: 58 },
    { date: '2024-01-07', views: 63 },
  ];

  const totalViews = resources.reduce((sum, resource) => sum + resource.views, 0);
  const totalDownloads = resources.reduce((sum, resource) => sum + resource.downloads, 0);
  const totalBookmarks = resources.reduce((sum, resource) => sum + resource.bookmarks, 0);

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
        <LoadingSkeleton type="card" count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-black mb-2">Contributor Dashboard</h1>
          <p className="text-secondary-600">Manage your resources and track engagement</p>
        </div>
        <Button
          variant="primary"
          onClick={onUploadClick}
          className="flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Resource</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <Card className="p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Total Resources</p>
              <p className="text-2xl font-bold text-black">{resources.length}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
            <span className="text-success-600">+2 this month</span>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Total Views</p>
              <p className="text-2xl font-bold text-black">{totalViews.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-secondary-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
            <span className="text-success-600">+12% vs last month</span>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Downloads</p>
              <p className="text-2xl font-bold text-black">{totalDownloads.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
              <Download className="h-6 w-6 text-accent-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
            <span className="text-success-600">+8% vs last month</span>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600">Engagement</p>
              <p className="text-2xl font-bold text-black">{((totalDownloads / totalViews) * 100).toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-warning-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
            <span className="text-success-600">+3% vs last month</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Analytics Chart */}
        <Card className="p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-black flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Views Over Time
            </h3>
            <div className="flex space-x-2">
              {(['7d', '30d', '90d'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    selectedPeriod === period
                      ? 'bg-secondary-500 text-white'
                      : 'bg-background-200 text-secondary-600 hover:bg-background-300'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockDailyViews}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#F5EFE7', 
                    border: '1px solid #D8C4B6',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#3E5879" 
                  strokeWidth={2}
                  dot={{ fill: '#3E5879', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Resources */}
        <Card className="p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-semibold text-black mb-6 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Top Performing Resources
          </h3>
          <div className="space-y-4">
            {resources
              .sort((a, b) => b.views - a.views)
              .slice(0, 5)
              .map((resource, index) => (
                <div key={resource.id} className="flex items-center space-x-4 p-3 hover:bg-background-100 rounded-lg transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 bg-secondary-100 rounded-lg text-sm font-semibold text-secondary-600">
                    {index + 1}
                  </div>
                  <div className="text-2xl">{getTypeIcon(resource.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-black line-clamp-1">{resource.title}</p>
                    <div className="flex items-center space-x-4 text-sm text-secondary-500">
                      <span>{resource.views} views</span>
                      <span>•</span>
                      <span>{resource.downloads} downloads</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResourceEdit(resource.id)}
                  >
                    Edit
                  </Button>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Resources Table */}
      <Card className="p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <h3 className="font-semibold text-black mb-6">All Resources</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-300">
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Resource</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Category</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Views</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Downloads</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Size</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Uploaded</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id} className="border-b border-background-200 hover:bg-background-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">{getTypeIcon(resource.type)}</div>
                      <div>
                        <p className="font-medium text-black">{resource.title}</p>
                        <p className="text-sm text-secondary-500 line-clamp-1">{resource.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-secondary-600">{resource.category}</td>
                  <td className="py-3 px-4 text-sm text-black">{resource.views.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-black">{resource.downloads.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-secondary-600">{formatFileSize(resource.fileSize)}</td>
                  <td className="py-3 px-4 text-sm text-secondary-600">
                    {resource.uploadedAt.toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onResourceEdit(resource.id)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};