// project/src/components/resources/ResourceViewModal.tsx
import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon, BookmarkIcon, ShareIcon } from '@heroicons/react/24/outline'; // Using Heroicons for consistency
import { Button } from '../ui/Button';
// import { Input } from '../ui/Input'; // Input is no longer needed in this component
import { Card } from '../ui/Card';
import { Resource } from '../../types'; // Import Resource type from your types/index.ts
// import { useForm } from 'react-hook-form'; // react-hook-form is no longer needed
// import emailjs from 'emailjs-com'; // EmailJS is being removed
import {
  X, FileText, Download, Star, Calendar, User, Mail, Phone, MessageCircle, Send, BookOpen, ExternalLink, Eye, Share2 // Lucide icons from user's provided code
} from 'lucide-react';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline'; // Outline heart for unbookmarked
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';   // Solid heart for bookmarked

// Removed ContactForm interface as it's no longer used

interface ResourceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  relatedResources: Resource[];
  onDownload: (resourceId: string) => void;
  onBookmark: (resourceId: string) => Promise<void>;
  onShare: (resourceId: string) => void;
}

export const ResourceViewModal: React.FC<ResourceViewModalProps> = ({
  isOpen,
  onClose,
  resource,
  relatedResources,
  onDownload,
  onBookmark,
  onShare,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'related' | 'contact'>('preview');
  // Removed isContactLoading and contactStatus states
  const [bookmarkMessage, setBookmarkMessage] = useState<string | null>(null); // State for bookmark message

  // Removed useForm hook

  // Function to safely format dates
  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'N/A';
    }
  };

  // Removed onContactSubmit function

  // Helper function to format file size
  const formatFileSize = (bytes: number | undefined) => {
    if (bytes === undefined || bytes === null) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Helper function to get icon based on resource type
  const getTypeIcon = (type: string | undefined) => {
    if (!type) return '📁';
    switch (type.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'ppt':
      case 'pptx':
        return '📊';
      case 'link':
        return '🔗';
      case 'pyq':
        return '📜'; // Scroll icon for PYQ
      default:
        return '📁';
    }
  };

  // Local handler for bookmark click to show message
  const handleBookmarkClick = async (resourceId: string) => {
    try {
      await onBookmark(resourceId); // Call parent's bookmark handler
      // The resource prop will be updated via react-query invalidation,
      // so we can rely on its `isBookmarked` value for the message.
      setBookmarkMessage(resource?.isBookmarked ? 'Removed from bookmarks!' : 'Bookmarked!');
    } catch (error: any) {
      setBookmarkMessage(`Error: ${error.message || 'Failed to toggle bookmark.'}`);
    } finally {
      setTimeout(() => setBookmarkMessage(null), 2000); // Clear message after 2 seconds
    }
  };


  if (!isOpen || !resource) return null;

  // Tabs configuration
  const tabs = [
    { id: 'preview', label: 'Preview', icon: BookOpen },
    { id: 'related', label: 'Related Resources', icon: ExternalLink },
    { id: 'contact', label: 'Contact Contributor', icon: MessageCircle },
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto"> {/* This handles overall viewport scrolling if needed */}
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              {/* This is the main modal panel. overflow-y-auto is crucial here for the overall modal scrollbar. */}
              <Dialog.Panel className="w-full max-w-6xl max-h-[90vh] transform overflow-y-auto rounded-2xl bg-white text-left align-middle shadow-xl transition-all custom-scrollbar"> {/* Added custom-scrollbar class here */}
                {/* Custom CSS for scrollbar styling */}
                <style>
                  {`
                  /* For Webkit browsers (Chrome, Safari) */
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 8px; /* width of the vertical scrollbar */
                    height: 8px; /* height of the horizontal scrollbar */
                  }

                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1; /* color of the track */
                    border-radius: 10px;
                  }

                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #888; /* color of the scroll thumb */
                    border-radius: 10px;
                  }

                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555; /* color of the scroll thumb on hover */
                  }

                  /* For Firefox */
                  .custom-scrollbar {
                    scrollbar-width: thin; /* "auto" or "thin" */
                    scrollbar-color: #888 #f1f1f1; /* thumb color track color */
                  }
                  `}
                </style>
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-background-300">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{getTypeIcon(resource.resourceType)}</div> {/* Corrected to resource.resourceType */}
                      <div>
                        <h2 className="text-2xl font-bold text-black">
                          {resource.title}
                        </h2>
                        <div className="flex items-center space-x-4 text-sm text-secondary-600">
                          <span>{resource.subject}</span> {/* Corrected to resource.subject */}
                          <span>•</span>
                          <span>{formatFileSize(resource.fileSize)}</span>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{resource.views} views</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            <Download className="h-4 w-4" />
                            <span>{resource.downloads} downloads</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBookmarkClick(resource.id)} // Call local handler
                        className={`flex items-center space-x-1 ${resource.isBookmarked ? 'text-primary-600' : 'text-secondary-600'}`}
                      >
                        {resource.isBookmarked ? (
                          <HeartIconSolid className="h-4 w-4" /> // Solid icon if bookmarked
                        ) : (
                          <HeartIconOutline className="h-4 w-4" /> // Outline icon if not bookmarked
                        )}
                        <span>{resource.isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onShare(resource.id)}
                        className="flex items-center space-x-1"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Share</span>
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
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-background-200 rounded-lg transition-colors"
                      >
                        <X className="h-6 w-6 text-secondary-500" />
                      </button>
                    </div>
                  </div>

                  {/* Bookmark Message Display */}
                  {bookmarkMessage && (
                    <div className="px-6 py-2 text-center text-sm font-medium text-success-700 bg-success-50 border-b border-success-200 animate-fade-in-down">
                      {bookmarkMessage}
                    </div>
                  )}

                  {/* Tab Navigation */}
                  <div className="flex border-b border-background-300">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-all duration-300 ${
                            activeTab === tab.id
                              ? 'text-secondary-600 border-b-2 border-secondary-500 bg-secondary-50'
                              : 'text-secondary-500 hover:text-secondary-700 hover:bg-background-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Content */}
                  {/* This div handles scrolling for the content within each tab */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'preview' && (
                      <div className="space-y-6">
                        {/* Document Preview */}
                        <Card className="p-8">
                          <div className="text-center">
                            <div className="text-6xl">{getTypeIcon(resource.resourceType)}</div>
                            <h3 className="text-lg font-semibold text-black mb-2">
                              Document Preview
                            </h3>
                            <p className="text-secondary-600 mb-6">
                              Preview functionality would be integrated here with a PDF viewer or document renderer
                            </p>
                            <div className="bg-background-100 rounded-lg p-12 mb-6">
                              <p className="text-secondary-500 text-sm">
                                Document content preview area
                              </p>
                            </div>
                            <Button
                              variant="primary"
                              onClick={() => onDownload(resource.id)}
                              className="flex items-center space-x-2"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download Full Document</span>
                            </Button>
                          </div>
                        </Card>

                        {/* Resource Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="p-6">
                            <h4 className="font-semibold text-black mb-4">Description</h4>
                            <p className="text-secondary-600 leading-relaxed">
                              {resource.description}
                            </p>
                          </Card>

                          <Card className="p-6">
                            <h4 className="font-semibold text-black mb-4">Details</h4>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-secondary-500" />
                                <span className="text-sm text-secondary-600">
                                  Uploaded: {formatDate(resource.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Download className="h-4 w-4 text-secondary-500" />
                                <span className="text-sm text-secondary-600">
                                  {resource.downloads} downloads
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Eye className="h-4 w-4 text-secondary-500" />
                                <span className="text-sm text-secondary-600">
                                  {resource.views} views
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-secondary-500" />
                                <span className="text-sm text-secondary-600">
                                  Version {resource.version}
                                </span>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Tags */}
                        <Card className="p-6">
                          <h4 className="font-semibold text-black mb-4">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {resource.tags.map((tagObj, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 text-sm bg-secondary-100 text-secondary-800 rounded-full"
                              >
                                {tagObj.tag?.name} {/* Access tag.name */}
                              </span>
                            ))}
                          </div>
                        </Card>
                      </div>
                    )}

                    {activeTab === 'related' && (
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-6">
                          Related Resources
                        </h3>
                        {relatedResources.length > 0 ? (
                          <div className="space-y-4">
                            {relatedResources.map((relatedResource) => (
                              <Card key={relatedResource.id} className="p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                                <div className="flex items-start space-x-4">
                                  <div className="text-2xl">{getTypeIcon(relatedResource.resourceType)}</div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-black mb-1">
                                      {relatedResource.title}
                                    </h4>
                                    <p className="text-sm text-secondary-600 mb-2 line-clamp-2">
                                      {relatedResource.description}
                                    </p>
                                    <div className="flex items-center space-x-4 text-xs text-secondary-500">
                                      <span>{relatedResource.subject}</span>
                                      <span>•</span>
                                      <span>{formatFileSize(relatedResource.fileSize)}</span>
                                      <span>•</span>
                                      <div className="flex items-center space-x-1">
                                        <Eye className="h-3 w-3" />
                                        <span>{relatedResource.views}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => onDownload(relatedResource.id)}>
                                      View
                                    </Button>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => onDownload(relatedResource.id)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card className="p-12 text-center">
                            <BookOpen className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                            <p className="text-secondary-600">
                              No related resources found
                            </p>
                          </Card>
                        )}
                      </div>
                    )}

                    {activeTab === 'contact' && (
                      <div className="max-h-full overflow-y-auto"> {/* This div ensures contact tab content scrolls */}
                        <div className="max-w-2xl mx-auto">
                          <h3 className="text-lg font-semibold text-black mb-6">
                            Contact Resource Contributor
                          </h3>

                          {/* Contributor Info */}
                          <Card className="p-6 mb-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-16 h-16 bg-secondary-500 rounded-full flex items-center justify-center">
                                <User className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-black">{resource.uploader?.name || 'N/A'}</h4>
                                <p className="text-sm text-secondary-600">
                                  {resource.uploader?.institution || 'Educator'}
                                </p>
                                <p className="text-sm text-secondary-500">
                                  {resource.uploader?.bio || 'No bio provided'}
                                </p>
                                <div className="flex items-center space-x-4 mt-2">
                                  {resource.uploader?.email && (
                                    <a href={`mailto:${resource.uploader.email}`} className="flex items-center space-x-1 text-sm text-secondary-500 hover:text-primary-600 hover:underline">
                                      <Mail className="h-3 w-3" />
                                      <span>{resource.uploader.email}</span>
                                    </a>
                                  )}
                                  {resource.uploader?.contactEmail && ( // NEW: Display contactEmail
                                    <a href={`mailto:${resource.uploader.contactEmail}`} className="flex items-center space-x-1 text-sm text-secondary-500 hover:text-primary-600 hover:underline">
                                      <EnvelopeIcon className="h-3 w-3" />
                                      <span>{resource.uploader.contactEmail}</span>
                                    </a>
                                  )}
                                  {resource.uploader?.phone && ( // NEW: Display phone
                                    <a href={`tel:${resource.uploader.phone}`} className="flex items-center space-x-1 text-sm text-secondary-500 hover:text-primary-600 hover:underline">
                                      <Phone className="h-3 w-3" />
                                      <span>{resource.uploader.phone}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>

                          {/* Conditional rendering for contact form based on allowContact */}
                          {resource.allowContact ? (
                            <Card className="p-6 text-center bg-blue-50 border-blue-200">
                              <p className="text-blue-700 text-sm">
                                You can contact the contributor using the details above.
                              </p>
                            </Card>
                          ) : (
                            <Card className="p-6 text-center">
                              <MessageCircle className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                              <p className="text-secondary-600">
                                This contributor has chosen not to receive direct messages.
                              </p>
                            </Card>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
