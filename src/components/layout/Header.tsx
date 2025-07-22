// project/src/components/layout/Header.tsx
import React, { useState, Fragment } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SignedIn, SignedOut, SignInButton, SignUpButton, useClerk } from '@clerk/clerk-react'; // Import useClerk for sign-out
import { MagnifyingGlassIcon, PlusIcon, ChevronDownIcon, Cog6ToothIcon, FolderIcon, ArrowRightOnRectangleIcon,  DocumentTextIcon } from '@heroicons/react/24/outline'; // Example icons
import { Dialog, Menu, Transition } from '@headlessui/react'; // For mobile menu and custom dropdown
import { Button } from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline'; // For mobile menu close button

interface HeaderProps {
  onSearch: (query: string) => void;
  onUploadClick?: () => void;
  onNavigateToPyq: () => void;
  onNavigateToDashboard: () => void;
  currentPage: 'dashboard' | 'pyq';
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export const Header: React.FC<HeaderProps> = ({ onSearch, onUploadClick, onNavigateToPyq, onNavigateToDashboard, currentPage }) => {
  const { user, isAuthenticated, logout } = useAuth(); // Get user and isAuthenticated from context
  const { signOut } = useClerk(); // Get Clerk's signOut function
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleSignOut = async () => {
    await signOut();
    logout(); // Clear local auth context
    // Optionally redirect to home or login page after sign out
    window.location.href = '/';
  };

  return (
    <header className="bg-white shadow-sm z-40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex-shrink-0">
          <button onClick={onNavigateToDashboard} className="flex items-center focus:outline-none">
            <img className="h-8 w-auto" src="/ChatGPT Image Jul 15, 2025, 12_10_35 PM.png" alt="StudyStack Logo" />
            <span className="ml-2 text-xl font-bold text-gray-900">StudyStack</span>
          </button>
        </div>

       

        {/* Search Bar (Desktop) */}
        <div className="hidden md:block flex-grow max-w-md mx-8">
          <form onSubmit={handleSearchSubmit} className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              name="search"
              id="search"
              className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md"
              placeholder="Search resources, subjects, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Right Section: Notifications, Upload, User Dropdown */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user?.role === 'contributor' && onUploadClick && (
            <button
              onClick={onUploadClick}
              className="hidden md:flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-150 ease-in-out"
            >
              <PlusIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Upload Resource
            </button>
          )}

          {/* Custom User Dropdown */}
          <SignedIn>
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="flex items-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  <span className="sr-only">Open user menu</span>
                  <img
                    className="h-9 w-9 rounded-full object-cover"
                    src={user?.avatar || `https://placehold.co/100x100/aabbcc/ffffff?text=${user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}`}
                    alt="User Avatar"
                    onError={(e: any) => { e.target.onerror = null; e.target.src = `https://placehold.co/100x100/aabbcc/ffffff?text=${user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}`; }}
                  />
                  <span className="hidden md:block ml-2 text-gray-700 font-medium">{user?.name || user?.email}</span>
                  <ChevronDownIcon className="ml-1 h-5 w-5 text-gray-500 hidden md:block" aria-hidden="true" />
                </Menu.Button>
              </div>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-3">
                    <p className="text-sm">Signed in as</p>
                    <p className="truncate text-sm font-medium text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role || 'Viewer'}</p>
                  </div>
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => { /* Handle Settings navigation, e.g., navigate('/settings') */ }}
                          className={classNames(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'group flex items-center px-4 py-2 text-sm w-full text-left'
                          )}
                        >
                          <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                          Settings
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => { onNavigateToPyq(); setIsMobileMenuOpen(false); }} // Link to PYQ page
                          className={classNames(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'group flex items-center px-4 py-2 text-sm w-full text-left'
                          )}
                        >
                          <DocumentTextIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" /> {/* Using DocumentTextIcon */}
                          Previous Year Papers
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => { /* Handle My Resources navigation, e.g., navigate('/my-resources') */ }}
                          className={classNames(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'group flex items-center px-4 py-2 text-sm w-full text-left'
                          )}
                        >
                          <FolderIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                          My Resources
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleSignOut} // Call custom sign-out handler
                          className={classNames(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'group flex items-center px-4 py-2 text-sm w-full text-left'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                          Sign Out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </SignedIn>
          <SignedOut>
            {/* Show Sign In/Sign Up buttons if not authenticated */}
            <SignInButton mode="modal">
              <Button variant="outline" className="hidden md:block">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button className="hidden md:block ml-2">Sign Up</Button>
            </SignUpButton>
          </SignedOut>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu (Dialog) */}
      <Dialog as="div" className="md:hidden" open={isMobileMenuOpen} onClose={setIsMobileMenuOpen}>
        <div className="fixed inset-0 z-40 bg-black bg-opacity-25" />
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs overflow-y-auto bg-white shadow-xl">
          <div className="flex justify-end p-4">
            <button
              type="button"
              className="-m-2 p-2 rounded-md inline-flex items-center justify-center text-gray-400"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="px-4 py-6 space-y-6">
            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit} className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                name="search"
                id="mobile-search"
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            {/* Mobile Navigation Links */}
            <nav className="space-y-2">
              <button
                onClick={() => { onNavigateToDashboard(); setIsMobileMenuOpen(false); }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 ${
                  currentPage === 'dashboard' ? 'bg-gray-100 text-primary-600' : ''
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => { onNavigateToPyq(); setIsMobileMenuOpen(false); }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 ${
                  currentPage === 'pyq' ? 'bg-gray-100 text-primary-600' : ''
                }`}
              >
                Previous Year Papers
              </button>
            </nav>

            {isAuthenticated && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center px-4">
                  {/* User avatar and info in mobile menu */}
                  <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={user?.avatar || `https://placehold.co/100x100/aabbcc/ffffff?text=${user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}`}
                    alt="User Avatar"
                    onError={(e: any) => { e.target.onerror = null; e.target.src = `https://placehold.co/100x100/aabbcc/ffffff?text=${user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}`; }}
                  />
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user?.name || user?.email}</div>
                    <div className="text-sm font-medium text-gray-500 capitalize">{user?.role || 'Viewer'}</div>
                  </div>
                </div>
                {user?.role === 'contributor' && onUploadClick && (
                  <button
                    onClick={() => { onUploadClick(); setIsMobileMenuOpen(false); }}
                    className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <PlusIcon className="h-6 w-6 mr-2" aria-hidden="true" />
                    Upload Resource
                  </button>
                )}
                <button
                  onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }} // Call custom sign-out handler
                  className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Sign Out
                </button>
              </div>
            )}
            {!isAuthenticated && (
              <div className="border-t border-gray-200 pt-6">
                <SignInButton mode="modal">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="w-full mt-3">Sign Up</Button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </header>
  );
};
