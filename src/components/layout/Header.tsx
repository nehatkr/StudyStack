import React, { useState } from 'react';
import { Search, Bell, User, Menu, X, Upload, LogOut, Settings, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface HeaderProps {
  onSearch: (query: string) => void;
  onUploadClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, onUploadClick }) => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <header className="bg-primary-500 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <img 
                src="/ChatGPT Image Jul 15, 2025, 12_10_35 PM.png" 
                alt="StudyStack Logo" 
                className="w-10 h-10 rounded-lg object-cover"
              />
              <span className="ml-3 text-xl font-bold text-white">
                StudyStack
              </span>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="w-full">
              <Input
                type="text"
                placeholder="Search resources, subjects, or tags..."
                value={searchQuery}
                onChange={handleSearchChange}
                icon={<Search className="h-4 w-4" />}
                className="bg-white/10 border-white/20 text-white placeholder-white/70 focus:bg-white/20"
              />
            </form>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Upload Button - Contributors only */}
            {user && user.role === 'contributor' && onUploadClick && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onUploadClick}
                className="hidden sm:flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Button>
            )}

            {/* Notifications */}
            {user && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden sm:flex p-2 text-white hover:bg-white/10"
              >
                <Bell className="h-5 w-5" />
              </Button>
            )}

            {/* Profile Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-secondary-500 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-white">
                    {user.name}
                  </span>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 animate-slide-down">
                    <Card className="py-2 shadow-xl border border-background-300">
                      <div className="px-4 py-3 border-b border-background-300">
                        <p className="text-sm font-medium text-black">
                          {user.name}
                        </p>
                        <p className="text-xs text-secondary-500">
                          {user.email}
                        </p>
                        <p className="text-xs text-accent-500 capitalize">
                          {user.role}
                        </p>
                      </div>
                      <div className="py-1">
                        <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-black hover:bg-background-200 transition-colors">
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </button>
                        <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-black hover:bg-background-200 transition-colors">
                          <BookOpen className="h-4 w-4" />
                          <span>My Resources</span>
                        </button>
                        <button
                          onClick={logout}
                          className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            ) : (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 transform hover:scale-105 transition-all duration-200"
              >
                Sign In
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-white hover:bg-white/10"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20 animate-slide-down">
            <form onSubmit={handleSearch}>
              <Input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={handleSearchChange}
                icon={<Search className="h-4 w-4" />}
                className="bg-white/10 border-white/20 text-white placeholder-white/70"
              />
            </form>
            {user && user.role === 'contributor' && onUploadClick && (
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onUploadClick}
                  className="w-full flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Resource</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
};