// project/src/components/resources/ResourceViewModal.tsx
import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon, BookmarkIcon, ShareIcon } from '@heroicons/react/24/outline'; // Using Heroicons for consistency
import { Button } from '../ui/Button';
import { Input } from '../ui/Input'; // Assuming Input component is in ../ui/Input
import { Card } from '../ui/Card';
import { Resource } from '../../types'; // Import Resource type from your types/index.ts
import { useForm } from 'react-hook-form'; // Assuming react-hook-form is used for the contact form
import emailjs from 'emailjs-com'; // Assuming EmailJS for contact form submission
import {
  X, FileText, Download, Star, Calendar, User, Mail, Phone, MessageCircle, Send, BookOpen, ExternalLink, Eye, Bookmark, Share2 // Lucide icons from user's provided code
} from 'lucide-react';

// Define the structure for the contact form
interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ResourceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  relatedResources: Resource[];
  onDownload: (resourceId: string) => void;
  onBookmark: (resourceId: string) => void;
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
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactStatus, setContactStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Initialize react-hook-form for the contact form
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactForm>();

  // Function to safely format dates
  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'N/A';
    }
  };

  // Handle contact form submission
  const onContactSubmit = async (data: ContactForm) => {
    if (!resource) return;

    setIsContactLoading(true);
    setContactStatus('idle');

    try {
      // EmailJS configuration - replace with your actual values
      // You need to sign up for EmailJS (emailjs.com) to get these credentials.
      // After signing up, create a service (e.g., 'Gmail'), a template, and get your User ID.
      const serviceId = 'your_service_id'; // <<-- REPLACE THIS
      const templateId = 'your_template_id'; // <<-- REPLACE THIS
      const userId = 'your_user_id'; // <<-- REPLACE THIS (Public Key)

      // Basic validation for EmailJS credentials
      if (serviceId === 'your_service_id' || templateId === 'your_template_id' || userId === 'your_user_id') {
        throw new Error("EmailJS credentials are not configured. Please update ResourceViewModal.tsx.");
      }

      const templateParams = {
        to_name: resource.uploader?.name || 'Resource Contributor',
        from_name: data.name,
        from_email: data.email,
        subject: data.subject,
        message: data.message,
        resource_title: resource.title,
        resource_id: resource.id,
        // Add contributor's email to template params for EmailJS to send to
        contributor_email: resource.uploader?.email || 'N/A',
      };

      await emailjs.send(serviceId, templateId, templateParams, userId);

      setContactStatus('success');
      reset(); // Reset form on success

      setTimeout(() => {
        setContactStatus('idle');
      }, 3000); // Clear status message after 3 seconds
    } catch (error: any) {
      console.error('Email send error:', error);
      setContactStatus('error');

      setTimeout(() => {
        setContactStatus('idle');
      }, 3000); // Clear status message after 3 seconds
    } finally {
      setIsContactLoading(false);
    }
  };

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
        return '�';
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
                        onClick={() => onBookmark(resource.id)}
                        className="flex items-center space-x-1"
                      >
                        <Bookmark className="h-4 w-4" />
                        <span>Bookmark</span>
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
                                <h4 className="font-semibold text-black">{resource.uploader?.name}</h4> {/* Added optional chaining */}
                                <p className="text-sm text-secondary-600">
                                  {/* Placeholder for institution/role if available on uploader object */}
                                  {resource.uploader?.institution || 'Educator'} {/* Added optional chaining */}
                                </p>
                                <p className="text-sm text-secondary-500">
                                  {/* Placeholder for specific university if available */}
                                  {resource.uploader?.bio || 'No bio provided'} {/* Added optional chaining */}
                                </p>
                                <div className="flex items-center space-x-4 mt-2">
                                  {resource.uploader?.email && ( /* Added optional chaining */
                                    <div className="flex items-center space-x-1 text-sm text-secondary-500">
                                      <Mail className="h-3 w-3" />
                                      <span>{resource.uploader.email}</span>
                                    </div>
                                  )}
                                  {resource.uploader?.contactInfo?.phone && ( /* Removed allowContact check, added optional chaining */
                                    <div className="flex items-center space-x-1 text-sm text-secondary-500">
                                      <Phone className="h-3 w-3" />
                                      <span>{resource.uploader.contactInfo.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>

                          {/* Contact Form - ALWAYS RENDERED */}
                          <Card className="p-6">
                            <form onSubmit={handleSubmit(onContactSubmit)} className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                  label="Your Name"
                                  placeholder="Enter your name"
                                  icon={<User className="h-4 w-4" />}
                                  {...register('name', { required: 'Name is required' })}
                                  error={errors.name?.message}
                                />
                                <Input
                                  label="Your Email"
                                  type="email"
                                  placeholder="Enter your email"
                                  icon={<Mail className="h-4 w-4" />}
                                  {...register('email', { required: 'Email is required' })}
                                  error={errors.email?.message}
                                />
                              </div>

                              <Input
                                label="Subject"
                                placeholder="What's this about?"
                                {...register('subject', { required: 'Subject is required' })}
                                error={errors.subject?.message}
                              />

                              <div>
                                <label className="block text-sm font-medium text-black mb-1">
                                  Message
                                </label>
                                <textarea
                                  {...register('message', { required: 'Message is required' })}
                                  rows={6}
                                  className="w-full px-3 py-2 bg-card-500 border border-background-400 rounded-lg text-black placeholder-secondary-400 focus:ring-2 focus:ring-secondary-500 focus:border-transparent resize-none transition-all duration-300"
                                  placeholder="Write your message here..."
                                ></textarea>
                                {errors.message && (
                                  <p className="text-sm text-error-500 mt-1">{errors.message.message}</p>
                                )}
                              </div>

                              {/* Contact Status */}
                              {contactStatus === 'success' && (
                                <div className="flex items-center space-x-3 p-4 bg-success-50 border border-success-200 rounded-lg animate-slide-down">
                                  <div className="w-5 h-5 bg-success-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <span className="text-sm text-success-700">
                                    Message sent successfully!
                                  </span>
                                </div>
                              )}

                              {contactStatus === 'error' && (
                                <div className="flex items-center space-x-3 p-4 bg-error-50 border border-error-200 rounded-lg animate-slide-down">
                                  <div className="w-5 h-5 bg-error-500 rounded-full flex items-center justify-center">
                                    <X className="w-3 h-3 text-white" />
                                  </div>
                                  <span className="text-sm text-error-700">
                                    Failed to send message. Please try again.
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-end space-x-4">
                                <Button variant="ghost" onClick={onClose} type="button">
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  variant="primary"
                                  loading={isContactLoading}
                                  className="flex items-center space-x-2"
                                >
                                  <Send className="h-4 w-4" />
                                  <span>Send Message</span>
                                </Button>
                              </div>
                            </form>
                          </Card>
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
