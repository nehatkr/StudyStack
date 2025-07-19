import React from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { SearchFilters } from '../../types';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  isOpen: boolean;
  onClose: () => void;
}

const subjects = [
  'Mathematics',
  'Computer Science',
  'Chemistry',
  'Physics',
  'Biology',
  'Economics',
  'Literature',
  'History',
];

const semesters = [
  'Fall 2024',
  'Spring 2024',
  'Fall 2023',
  'Spring 2023',
];

const resourceTypes = [
  { value: 'pdf', label: 'PDF Documents' },
  { value: 'document', label: 'Word Documents' },
  { value: 'presentation', label: 'Presentations' },
  { value: 'spreadsheet', label: 'Spreadsheets' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Downloaded' },
  { value: 'rating', label: 'Highest Rated' },
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFiltersChange,
  isOpen,
  onClose,
}) => {
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      query: filters.query,
      sortBy: 'newest',
    });
  };

  const FilterSection: React.FC<{
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
  }> = ({ title, children, defaultOpen = true }) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultOpen);

    return (
      <div className="mb-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 dark:text-white mb-3"
        >
          {title}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isExpanded && <div className="space-y-2">{children}</div>}
      </div>
    );
  };

  const sidebarContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filters
        </h3>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="md:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <FilterSection title="Sort By">
        <select
          value={filters.sortBy || 'newest'}
          onChange={(e) => updateFilter('sortBy', e.target.value)}
          className="w-full px-3 py-2 bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FilterSection>

      <FilterSection title="Subject">
        <div className="space-y-2">
          {subjects.map(subject => (
            <label key={subject} className="flex items-center">
              <input
                type="radio"
                name="subject"
                value={subject}
                checked={filters.subject === subject}
                onChange={(e) => updateFilter('subject', e.target.checked ? subject : undefined)}
                className="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{subject}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Semester">
        <div className="space-y-2">
          {semesters.map(semester => (
            <label key={semester} className="flex items-center">
              <input
                type="radio"
                name="semester"
                value={semester}
                checked={filters.semester === semester}
                onChange={(e) => updateFilter('semester', e.target.checked ? semester : undefined)}
                className="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{semester}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Resource Type">
        <div className="space-y-2">
          {resourceTypes.map(type => (
            <label key={type.value} className="flex items-center">
              <input
                type="radio"
                name="type"
                value={type.value}
                checked={filters.type === type.value}
                onChange={(e) => updateFilter('type', e.target.checked ? type.value : undefined)}
                className="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{type.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <GlassCard className="p-6 sticky top-6">
          {sidebarContent}
        </GlassCard>
      </div>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <div className="relative w-80 max-w-full bg-white/95 dark:bg-black/95 backdrop-blur-sm shadow-xl">
            <div className="p-6 h-full overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};