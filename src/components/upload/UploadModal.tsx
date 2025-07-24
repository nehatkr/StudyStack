// project/src/components/upload/UploadModal.tsx
import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { XMarkIcon, DocumentTextIcon, LinkIcon, AcademicCapIcon, BookOpenIcon, CalendarDaysIcon, GlobeAltIcon, HashtagIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline'; // Added PhoneIcon, EnvelopeIcon
import { CloudArrowUpIcon } from '@heroicons/react/24/solid'; // Solid icon for upload button

// Define form data structure for upload
interface UploadFormData {
  title: string;
  description: string;
  subject: string;
  resourceType: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ';
  semester?: string;
  year?: number;
  isPrivate: boolean;
  allowContact: boolean;
  fileName?: string;
  filePath?: string; // URL from storage
  fileSize?: number;
  mimeType?: string;
  url?: string; // For link resources
  tags: string; // Comma-separated tags
  phone?: string; // NEW: Optional phone number
  contactEmail?: string; // NEW: Optional contact email
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: UploadFormData) => void;
  initialResourceType?: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ'; // Optional initial type
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload, initialResourceType }) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<UploadFormData>({
    defaultValues: {
      resourceType: initialResourceType || 'PDF', // Set initial type
      isPrivate: false,
      allowContact: true,
      tags: '',
    }
  });

  const selectedResourceType = watch('resourceType');
  const watchIsPrivate = watch('isPrivate');
  const watchAllowContact = watch('allowContact');

  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // For simulated progress
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setValue('fileName', e.target.files[0].name);
      setValue('fileSize', e.target.files[0].size);
      setValue('mimeType', e.target.files[0].type);
    } else {
      setFile(null);
      setValue('fileName', undefined);
      setValue('fileSize', undefined);
      setValue('mimeType', undefined);
    }
  };

  const onSubmit = async (data: UploadFormData) => {
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      let filePath = data.filePath; // Use existing filePath if provided (e.g., for editing)
      let fileMimeType = data.mimeType;
      let fileOriginalName = data.fileName;
      let fileSizeBytes = data.fileSize;

      // Simulate file upload if a file is selected and not a LINK
      if (file && selectedResourceType !== 'LINK') {
        // In a real application, you would upload the file to a storage service (e.g., Supabase Storage, AWS S3)
        // and get a public URL (filePath) back.
        // For this example, we'll simulate it.
        console.log('Simulating file upload...');
        for (let i = 0; i <= 100; i += 10) {
          setUploadProgress(i);
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        }
        filePath = `https://example.com/uploads/${file.name}`; // Placeholder URL
        fileMimeType = file.type;
        fileOriginalName = file.name;
        fileSizeBytes = file.size;
      }

      const formattedData = {
        ...data,
        filePath: filePath,
        mimeType: fileMimeType,
        fileName: fileOriginalName,
        fileSize: fileSizeBytes,
        tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0), // Convert tags string to array
        // Ensure phone and contactEmail are included
        phone: data.phone || undefined,
        contactEmail: data.contactEmail || undefined,
      };

      onUpload(formattedData); // Pass the data to the parent component (App.tsx)
      setUploadStatus('success');
      setFile(null); // Clear file input
      setValue('filePath', undefined); // Clear mock file path
      reset(); // Reset form fields
      onClose(); // Close modal on successful upload
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
    }
  };

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

        <div className="fixed inset-0 overflow-y-auto">
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-gray-900">
                    Upload New Resource
                  </Dialog.Title>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <Input
                    id="title"
                    label="Title"
                    type="text"
                    placeholder="e.g., Advanced Calculus Notes"
                    {...register('title', { required: 'Title is required' })}
                    error={errors.title?.message}
                    icon={<DocumentTextIcon className="h-5 w-5 text-gray-400" />}
                  />

                  <Input
                    id="description"
                    label="Description"
                    type="textarea"
                    placeholder="Provide a brief description of the resource..."
                    {...register('description', { required: 'Description is required' })}
                    error={errors.description?.message}
                    rows={4}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      id="subject"
                      label="Subject"
                      type="text"
                      placeholder="e.g., Mathematics, Physics"
                      {...register('subject', { required: 'Subject is required' })}
                      error={errors.subject?.message}
                      icon={<AcademicCapIcon className="h-5 w-5 text-gray-400" />}
                    />

                    <div>
                      <label htmlFor="resourceType" className="block text-sm font-medium text-gray-700 mb-1">
                        Resource Type
                      </label>
                      <select
                        id="resourceType"
                        {...register('resourceType', { required: 'Resource type is required' })}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200 ease-in-out"
                      >
                        <option value="PDF">PDF</option>
                        <option value="DOC">DOC</option>
                        <option value="DOCX">DOCX</option>
                        <option value="PPT">PPT</option>
                        <option value="PPTX">PPTX</option>
                        <option value="PYQ">Previous Year Paper (PYQ)</option>
                        <option value="LINK">External Link</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {errors.resourceType && <p className="mt-1 text-sm text-red-600">{errors.resourceType.message}</p>}
                    </div>
                  </div>

                  {(selectedResourceType === 'PDF' || selectedResourceType === 'DOC' || selectedResourceType === 'DOCX' || selectedResourceType === 'PPT' || selectedResourceType === 'PPTX' || selectedResourceType === 'OTHER' || selectedResourceType === 'PYQ') && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                          Upload File
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-primary-50 file:text-primary-700
                            hover:file:bg-primary-100"
                        />
                        {file && <p className="mt-2 text-sm text-gray-500">Selected file: {file.name} ({formatFileSize(file.size)})</p>}
                        {uploadStatus === 'uploading' && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div
                              className="bg-primary-600 h-2.5 rounded-full"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        )}
                        {uploadStatus === 'error' && <p className="mt-2 text-sm text-red-600">File upload failed. Please try again.</p>}
                      </div>
                    </div>
                  )}

                  {selectedResourceType === 'LINK' && (
                    <Input
                      id="url"
                      label="External URL"
                      type="url"
                      placeholder="e.g., https://example.com/resource"
                      {...register('url', { required: 'URL is required for external links' })}
                      error={errors.url?.message}
                      icon={<LinkIcon className="h-5 w-5 text-gray-400" />}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedResourceType !== 'LINK' && ( // Semester only for file-based resources
                      <Input
                        id="semester"
                        label="Semester (Optional)"
                        type="text"
                        placeholder="e.g., Fall 2023, Semester 1"
                        {...register('semester')}
                        icon={<CalendarDaysIcon className="h-5 w-5 text-gray-400" />}
                      />
                    )}
                    {selectedResourceType === 'PYQ' && ( // Year only for PYQ
                      <Input
                        id="year"
                        label="Year (Optional, required for PYQ)"
                        type="number"
                        placeholder="e.g., 2022"
                        {...register('year', { valueAsNumber: true, required: selectedResourceType === 'PYQ' ? 'Year is required for PYQ' : false })}
                        error={errors.year?.message}
                        icon={<CalendarDaysIcon className="h-5 w-5 text-gray-400" />}
                      />
                    )}
                  </div>

                  <Input
                    id="tags"
                    label="Tags (Comma-separated, Optional)"
                    type="text"
                    placeholder="e.g., math, calculus, notes"
                    {...register('tags')}
                    icon={<HashtagIcon className="h-5 w-5 text-gray-400" />}
                  />

                  {/* NEW: Phone Number and Contact Email Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      id="phone"
                      label="Phone Number (Optional)"
                      type="tel"
                      placeholder="e.g., +15551234567"
                      {...register('phone')}
                      icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
                    />
                    <Input
                      id="contactEmail"
                      label="Contact Email (Optional)"
                      type="email"
                      placeholder="e.g., your.contact@example.com"
                      {...register('contactEmail')}
                      icon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />}
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <input
                      id="isPrivate"
                      type="checkbox"
                      {...register('isPrivate')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700">
                      Mark as Private (Only visible to you)
                    </label>
                  </div>

                  <div className="flex items-center space-x-4">
                    <input
                      id="allowContact"
                      type="checkbox"
                      {...register('allowContact')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowContact" className="text-sm font-medium text-gray-700">
                      Allow viewers to contact me directly (via provided email/phone)
                    </label>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubmitting || uploadStatus === 'uploading'}
                      disabled={isSubmitting || uploadStatus === 'uploading'}
                    >
                      <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                      {uploadStatus === 'uploading' ? `Uploading (${uploadProgress}%)` : 'Upload Resource'}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Helper function for file size formatting
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
