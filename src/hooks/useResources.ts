import { useState, useEffect } from 'react';
import { Resource, SearchFilters, Activity, Bookmark, Analytics } from '../types';

// Mock data
const mockResources: Resource[] = [
  {
    id: '1',
    title: 'Advanced Data Structures and Algorithms',
    description: 'Comprehensive guide covering advanced data structures including trees, graphs, heaps, and complex algorithms with time complexity analysis and practical implementations.',
    type: 'pdf',
    category: 'computer-science',
    tags: ['algorithms', 'data-structures', 'programming', 'complexity'],
    fileUrl: 'https://example.com/dsa-advanced.pdf',
    fileSize: 8.5 * 1024 * 1024,
    uploadedBy: '1',
    uploadedAt: new Date('2024-01-15'),
    isPrivate: false,
    allowContact: true,
    views: 1245,
    downloads: 432,
    bookmarks: 89,
    version: 2,
  },
  {
    id: '2',
    title: 'Linear Algebra for Machine Learning',
    description: 'Essential linear algebra concepts for machine learning including vector spaces, eigenvalues, matrix decomposition, and their applications in ML algorithms.',
    type: 'pdf',
    category: 'mathematics',
    tags: ['linear-algebra', 'machine-learning', 'vectors', 'matrices'],
    fileUrl: 'https://example.com/linear-algebra-ml.pdf',
    fileSize: 6.2 * 1024 * 1024,
    uploadedBy: '2',
    uploadedAt: new Date('2024-02-20'),
    isPrivate: false,
    allowContact: true,
    views: 892,
    downloads: 267,
    bookmarks: 54,
    version: 1,
  },
  {
    id: '3',
    title: 'Quantum Physics Fundamentals',
    description: 'Introduction to quantum mechanics covering wave-particle duality, Schrödinger equation, quantum states, and measurement theory with practical examples.',
    type: 'pdf',
    category: 'physics',
    tags: ['quantum-physics', 'mechanics', 'wave-function', 'measurement'],
    fileUrl: 'https://example.com/quantum-physics.pdf',
    fileSize: 12.1 * 1024 * 1024,
    uploadedBy: '3',
    uploadedAt: new Date('2024-01-10'),
    isPrivate: false,
    allowContact: true,
    views: 756,
    downloads: 189,
    bookmarks: 67,
    version: 1,
  },
  {
    id: '4',
    title: 'Organic Chemistry Reaction Mechanisms',
    description: 'Detailed study of organic reaction mechanisms including nucleophilic substitution, elimination reactions, and aromatic chemistry with step-by-step explanations.',
    type: 'pdf',
    category: 'chemistry',
    tags: ['organic-chemistry', 'reactions', 'mechanisms', 'synthesis'],
    fileUrl: 'https://example.com/organic-chemistry.pdf',
    fileSize: 15.3 * 1024 * 1024,
    uploadedBy: '4',
    uploadedAt: new Date('2024-02-05'),
    isPrivate: false,
    allowContact: true,
    views: 634,
    downloads: 156,
    bookmarks: 43,
    version: 1,
  },
  {
    id: '5',
    title: 'Database Design and Optimization',
    description: 'Complete guide to database design principles, normalization, indexing strategies, query optimization, and performance tuning for modern applications.',
    type: 'pdf',
    category: 'computer-science',
    tags: ['database', 'sql', 'optimization', 'design'],
    fileUrl: 'https://example.com/database-design.pdf',
    fileSize: 9.7 * 1024 * 1024,
    uploadedBy: '1',
    uploadedAt: new Date('2024-01-25'),
    isPrivate: false,
    allowContact: true,
    views: 1089,
    downloads: 298,
    bookmarks: 72,
    version: 1,
  },
  {
    id: '6',
    title: 'Cell Biology and Molecular Genetics',
    description: 'Comprehensive overview of cell structure, function, and molecular genetics including DNA replication, transcription, translation, and gene regulation.',
    type: 'pdf',
    category: 'biology',
    tags: ['cell-biology', 'genetics', 'dna', 'molecular'],
    fileUrl: 'https://example.com/cell-biology.pdf',
    fileSize: 11.4 * 1024 * 1024,
    uploadedBy: '5',
    uploadedAt: new Date('2024-02-12'),
    isPrivate: false,
    allowContact: true,
    views: 567,
    downloads: 134,
    bookmarks: 38,
    version: 1,
  },
];

const mockActivities: Activity[] = [
  { id: '1', userId: '1', resourceId: '1', action: 'view', timestamp: new Date('2024-02-25T10:30:00') },
  { id: '2', userId: '1', resourceId: '2', action: 'download', timestamp: new Date('2024-02-25T09:15:00') },
  { id: '3', userId: '1', resourceId: '3', action: 'bookmark', timestamp: new Date('2024-02-24T16:45:00') },
  { id: '4', userId: '1', resourceId: '1', action: 'download', timestamp: new Date('2024-02-24T14:20:00') },
  { id: '5', userId: '1', resourceId: '4', action: 'view', timestamp: new Date('2024-02-23T11:10:00') },
];

const mockBookmarks: Bookmark[] = [
  { id: '1', userId: '1', resourceId: '1', category: 'favorites', createdAt: new Date('2024-02-20') },
  { id: '2', userId: '1', resourceId: '3', category: 'to-read', createdAt: new Date('2024-02-18') },
  { id: '3', userId: '1', resourceId: '5', category: 'favorites', createdAt: new Date('2024-02-15') },
];

const mockAnalytics: Analytics[] = [
  {
    resourceId: '1',
    views: 1245,
    downloads: 432,
    bookmarks: 89,
    dailyViews: [
      { date: '2024-02-20', views: 45 },
      { date: '2024-02-21', views: 52 },
      { date: '2024-02-22', views: 38 },
      { date: '2024-02-23', views: 67 },
      { date: '2024-02-24', views: 71 },
      { date: '2024-02-25', views: 58 },
      { date: '2024-02-26', views: 63 },
    ],
    topCountries: [
      { country: 'United States', count: 456 },
      { country: 'United Kingdom', count: 234 },
      { country: 'Canada', count: 189 },
    ],
  },
];

export const useResources = (filters: SearchFilters = {}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let filtered = [...mockResources];
      
      // Apply filters
      if (filters.query) {
        const query = filters.query.toLowerCase();
        filtered = filtered.filter(resource => 
          resource.title.toLowerCase().includes(query) ||
          resource.description.toLowerCase().includes(query) ||
          resource.category.toLowerCase().includes(query) ||
          resource.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      if (filters.category) {
        filtered = filtered.filter(resource => resource.category === filters.category);
      }
      
      if (filters.type) {
        filtered = filtered.filter(resource => resource.type === filters.type);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(resource => 
          filters.tags!.some(tag => resource.tags.includes(tag))
        );
      }
      
      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          filtered.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
          break;
        case 'oldest':
          filtered.sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
          break;
        case 'popular':
          filtered.sort((a, b) => b.views - a.views);
          break;
        case 'downloads':
          filtered.sort((a, b) => b.downloads - a.downloads);
          break;
        default:
          filtered.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      }
      
      setResources(filtered);
      setActivities(mockActivities);
      setBookmarks(mockBookmarks);
      setAnalytics(mockAnalytics);
    } catch (err) {
      setError('Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [filters]);

  return {
    resources,
    activities,
    bookmarks,
    analytics,
    loading,
    error,
    refetch: fetchResources,
  };
};