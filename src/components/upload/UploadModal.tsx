// project/src/components/upload/UploadModal.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { XMarkIcon } from '@heroicons/react/24/outline'; // Using Heroicons for consistency
import { UploadIcon, FileIcon, AlertCircleIcon, CheckCircleIcon, Trash2Icon } from 'lucide-react'; // Using Lucide for specific icons
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card'; // Ensure Card is imported
import { useAuth } from '../../contexts/AuthContext'; // To get uploaderId
import { Dialog, Transition } from '@headlessui/react';

// Define the form data structure to align with backend Resource model
interface UploadFormData {
  title: string;
  description: string;
  subject: string; // Changed from 'category' to 'subject' to match backend
  resourceType: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ';
  semester?: string;
  year?: number; // For PYQ
  isPrivate: boolean;
  allowContact: boolean;
  // These fields will be derived from the dropped files or entered for LINK
  fileName?: string;
  filePath?: string; // This will be the URL/path where the file is stored
  fileSize?: number;
  mimeType?: string;
  url?: string; // Only for LINK type
  isExternal?: boolean; // Only for LINK type
  tags: string; // Still a string for now, to be parsed by backend or managed separately
  
  // This is for react-dropzone to manage the actual File objects
  files: File[]; 
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onUpload will now receive data structured for the backend API
  onUpload: (data: Omit<UploadFormData, 'files' | 'tags'> & { tags: string[] }) => Promise<void>;
  initialResourceType?: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ'; // NEW: Optional initial resource type
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload, initialResourceType }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const { user, isLoading: authLoading } = useAuth(); // Get authenticated user for uploaderId

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting }, 
    setValue, 
    watch, 
    reset,
    setError, // For manual validation errors
    clearErrors, // To clear manual errors
  } = useForm<UploadFormData>({
    defaultValues: {
      isPrivate: false,
      allowContact: true,
      resourceType: initialResourceType || 'PDF', // Use initialResourceType if provided, else default to PDF
      files: [], // Initialize files as an empty array
    }
  });

  const selectedFiles = watch('files');
  const selectedResourceType = watch('resourceType');
  const watchedYear = watch('year'); // Watch year for conditional validation

  // Reset form and status when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        isPrivate: false,
        allowContact: true,
        resourceType: initialResourceType || 'PDF', // Reset with initialResourceType
        files: [],
      });
      setUploadStatus('idle');
      setUploadProgress([]);
      clearErrors(); // Clear any lingering errors
    }
  }, [isOpen, reset, clearErrors, initialResourceType]); // Add initialResourceType to dependencies

  const onDrop = useCallback((acceptedFiles: File[]) => {
    clearErrors('files'); // Clear file-related errors on new drop
    const validFiles = acceptedFiles.filter(file => {
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum file size is 50MB.`); // Use alert for now
        return false;
      }
      
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
      ];
      
      // Validate file type based on selectedResourceType
      if (selectedResourceType !== 'LINK' && !allowedTypes.includes(file.type) && selectedResourceType !== 'OTHER') {
        alert(`${file.name} is not a supported file type for ${selectedResourceType}. Please upload PDF, DOC, DOCX, PPT, or PPTX files.`);
        return false;
      }
      
      return true;
    });

    const currentFiles = selectedFiles || [];
    setValue('files', [...currentFiles, ...validFiles]);
  }, [selectedFiles, setValue, selectedResourceType, clearErrors]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Define accepted file types for the dropzone based on the selected resource type
    // This part might need more dynamic logic if 'OTHER' allows any file, or specific types for PYQ
    accept: selectedResourceType === 'LINK' ? {} : { // No file acceptance for LINK
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      // Add more specific types for 'OTHER' or 'PYQ' if needed, or leave broad
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    const currentFiles = selectedFiles || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);
    setValue('files', newFiles);
    if (newFiles.length === 0 && selectedResourceType !== 'LINK') {
      setError('files', { message: 'At least one file is required for file-based resources.' });
    }
  };

  const onSubmit: SubmitHandler<UploadFormData> = async (data) => {
    clearErrors(); // Clear all errors at the start of submission

    if (!user?.id) {
      console.error('Uploader ID is missing. User must be logged in.');
      setUploadStatus('error');
      setError('root', { message: 'Authentication error: Uploader ID missing.' });
      return;
    }

    // Manual validation checks
    if (selectedResourceType === 'LINK') {
      if (!data.url) {
        setError('url', { message: 'URL is required for Link type resources' });
        return;
      }
      if (data.files && data.files.length > 0) {
        setError('files', { message: 'File uploads are not allowed for Link type resources.' });
        return;
      }
    } else { // File-based resources (PDF, DOC, PYQ, etc.)
      if (!data.files || data.files.length === 0) {
        setError('files', { message: 'At least one file is required for file-based resources.' });
        return;
      }
      if (data.url) {
        setError('url', { message: 'URL should not be present for file-based resources.' });
        return;
      }
      if (selectedResourceType === 'PYQ' && (!data.year || isNaN(data.year))) {
        setError('year', { message: 'Year is required for Previous Year Papers' });
        return;
      }
    }

    setUploadStatus('uploading');
    
    // Initialize progress tracking for each file
    const initialProgress = data.files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadProgress(initialProgress);

    try {
      // Iterate through files and call onUpload for each
      for (let i = 0; i < data.files.length; i++) {
        const file = data.files[i];
        // Simulate actual file upload to storage here (e.g., Supabase Storage)
        // For now, we'll generate dummy file details
        const dummyFilePath = `https://example.com/uploads/${file.name.replace(/\s/g, '_')}`;
        const dummyFileSize = file.size;
        const dummyMimeType = file.type || 'application/octet-stream';

        // Update progress for the current file
        for (let p = 0; p <= 100; p += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadProgress(prev => 
            prev.map((item, idx) => 
              idx === i ? { ...item, progress: p } : item
            )
          );
        }
        setUploadProgress(prev => 
          prev.map((item, idx) => 
            idx === i ? { ...item, status: 'completed' as const } : item
          )
        );

        // Prepare data for the backend for this specific file
        const resourceDataForBackend = {
          title: data.title,
          description: data.description,
          subject: data.subject,
          resourceType: data.resourceType,
          semester: data.semester,
          year: data.resourceType === 'PYQ' ? data.year : undefined, // Only send year if PYQ
          isPrivate: data.isPrivate,
          allowContact: data.allowContact,
          fileName: file.name,
          filePath: dummyFilePath, // This would be the actual URL from storage
          fileSize: dummyFileSize,
          mimeType: dummyMimeType,
          url: data.resourceType === 'LINK' ? data.url : undefined,
          isExternal: data.resourceType === 'LINK',
          tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0), // Split tags into array
        };

        // Call the parent's onUpload callback for each file
        await onUpload(resourceDataForBackend);
      }
      
      setUploadStatus('success');
      
      // Reset form after successful upload
      setTimeout(() => {
        reset();
        setUploadStatus('idle');
        setUploadProgress([]);
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      setUploadProgress(prev => 
        prev.map(item => ({
          ...item,
          status: 'error' as const,
        }))
      );
      setError('root', { message: error.message || 'An unexpected error occurred during upload.' });
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    if (file.type.includes('presentation')) return '📊';
    return '📁';
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
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
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Re-wrapping content inside the Card component for consistent styling */}
                {/* The Card component provides the rounded corners, background, and shadow */}
                <Card className="p-0"> {/* Card component already has padding, set to p-0 here */}
                  <div className="p-6"> {/* Apply padding inside this div */}
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-black">
                        Upload Resources
                      </h2>
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-background-200 rounded-lg transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5 text-secondary-500" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      {/* File Upload Area */}
                      {selectedResourceType !== 'LINK' && ( // Only show dropzone for file-based types
                        <div
                          {...getRootProps()}
                          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                            isDragActive
                              ? 'border-secondary-500 bg-secondary-50'
                              : 'border-background-400 hover:border-secondary-400 hover:bg-background-50'
                          }`}
                        >
                          <input {...getInputProps()} />
                          
                          <UploadIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                          <p className="text-lg font-medium text-black mb-2">
                            {isDragActive ? 'Drop files here' : 'Drag & drop files here or click to browse'}
                          </p>
                          <p className="text-sm text-secondary-500 mb-4">
                            Supports PDF, DOC, DOCX, PPT, PPTX (max 50MB each)
                          </p>
                          <Button type="button" variant="outline">
                            Select Files
                          </Button>
                          {errors.files && ( // Error for file selection
                            <p className="mt-2 text-sm text-error-500">{errors.files.message}</p>
                          )}
                        </div>
                      )}

                      {/* Selected Files */}
                      {selectedFiles.length > 0 && selectedResourceType !== 'LINK' && (
                        <div className="space-y-3">
                          <h3 className="font-medium text-black">Selected Files ({selectedFiles.length})</h3>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-background-100 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl">{getFileIcon(file)}</span>
                                  <div>
                                    <p className="text-sm font-medium text-black">{file.name}</p>
                                    <p className="text-xs text-secondary-500">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="text-error-500 hover:text-error-600"
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upload Progress */}
                      {uploadProgress.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-medium text-black">Upload Progress</h3>
                          {uploadProgress.map((item, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-black">{item.file.name}</span>
                                <span className="text-sm text-secondary-500">{item.progress}%</span>
                              </div>
                              <div className="w-full bg-background-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    item.status === 'completed' ? 'bg-success-500' :
                                    item.status === 'error' ? 'bg-error-500' : 'bg-secondary-500'
                                  }`}
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Form Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <Input
                            label="Title"
                            placeholder="Enter resource title (5-100 characters)"
                            {...register('title', { 
                              required: 'Title is required',
                              minLength: { value: 5, message: 'Title must be at least 5 characters' },
                              maxLength: { value: 100, message: 'Title must be less than 100 characters' }
                            })}
                            error={errors.title?.message}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-black mb-1">
                            Description
                          </label>
                          <textarea
                            {...register('description', { 
                              required: 'Description is required',
                              minLength: { value: 50, message: 'Description must be at least 50 characters' },
                              maxLength: { value: 500, message: 'Description must be less than 500 characters' }
                            })}
                            rows={4}
                            className="w-full px-3 py-2 bg-card-500 border border-background-400 rounded-lg text-black placeholder-secondary-400 focus:ring-2 focus:ring-secondary-500 focus:border-transparent resize-none transition-all duration-300"
                            placeholder="Describe your resource (50-500 characters)..."
                          />
                          {errors.description && (
                            <p className="text-sm text-error-500 mt-1">{errors.description.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-black mb-1">
                            Subject
                          </label>
                          <Input // Using Input for subject as it was previously a text field
                            type="text"
                            placeholder="e.g., Mathematics, Physics"
                            {...register('subject', { required: 'Subject is required' })}
                            error={errors.subject?.message}
                          />
                        </div>

                        <div>
                          <label htmlFor="resourceType" className="block text-sm font-medium text-black mb-1">
                            Resource Type
                          </label>
                          <select
                            id="resourceType"
                            className="w-full px-3 py-2 bg-card-500 border border-background-400 rounded-lg text-black focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300"
                            {...register('resourceType', { required: 'Resource type is required' })}
                            disabled={!!initialResourceType} // Disable if initialResourceType is provided
                          >
                            <option value="PDF">PDF Document</option>
                            <option value="DOC">Word Document (.doc)</option>
                            <option value="DOCX">Word Document (.docx)</option>
                            <option value="PPT">PowerPoint (.ppt)</option>
                            <option value="PPTX">PowerPoint (.pptx)</option>
                            <option value="PYQ">Previous Year Paper</option>
                            <option value="LINK">External Link</option>
                            <option value="OTHER">Other File Type</option>
                          </select>
                          {errors.resourceType && (
                            <p className="mt-1 text-sm text-error-500">{errors.resourceType.message}</p>
                          )}
                        </div>

                        {/* Conditional Year input for PYQ */}
                        {selectedResourceType === 'PYQ' && (
                          <Input
                            label="Year of Paper"
                            type="number"
                            placeholder="e.g., 2023"
                            {...register('year', {
                              required: 'Year is required for PYQ',
                              valueAsNumber: true,
                              min: { value: 1900, message: 'Year must be after 1900' },
                              max: { value: new Date().getFullYear() + 1, message: 'Invalid year' }
                            })}
                            error={errors.year?.message}
                          />
                        )}

                        <Input
                          label="Semester (Optional)"
                          placeholder="e.g., Fall 2023, 1st Semester"
                          {...register('semester')}
                          error={errors.semester?.message}
                        />

                        {selectedResourceType === 'LINK' && (
                          <Input
                            label="External URL"
                            type="url"
                            placeholder="https://example.com/resource"
                            {...register('url', {
                              required: 'URL is required for Link type resources',
                              pattern: {
                                value: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
                                message: 'Invalid URL format'
                              }
                            })}
                            error={errors.url?.message}
                          />
                        )}

                        <Input
                          label="Tags"
                          placeholder="e.g., algorithms, data structures (comma-separated)"
                          {...register('tags')}
                          error={errors.tags?.message}
                          helperText="Separate tags with commas (e.g., exam, practice, solution)"
                        />

                        <div className="md:col-span-2 space-y-4">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="isPrivate"
                              {...register('isPrivate')}
                              className="text-secondary-600 focus:ring-secondary-500 rounded"
                            />
                            <label htmlFor="isPrivate" className="text-sm text-black">
                              Make this resource private (only you can see it)
                            </label>
                          </div>

                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="allowContact"
                              {...register('allowContact')}
                              className="text-secondary-600 focus:ring-secondary-500 rounded"
                            />
                            <label htmlFor="allowContact" className="text-sm text-black">
                              Allow students to contact me about this resource
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Global Error Display */}
                      {errors.root && (
                        <div className="flex items-center space-x-3 p-4 bg-error-50 border border-error-200 rounded-lg animate-slide-down">
                          <AlertCircleIcon className="h-5 w-5 text-error-500" />
                          <span className="text-sm text-error-700">{errors.root.message}</span>
                        </div>
                      )}

                      {/* Upload Status */}
                      {uploadStatus === 'success' && (
                        <div className="flex items-center space-x-3 p-4 bg-success-50 border border-success-200 rounded-lg animate-slide-down">
                          <CheckCircleIcon className="h-5 w-5 text-success-500" />
                          <span className="text-sm text-success-700">Upload successful!</span>
                        </div>
                      )}

                      {uploadStatus === 'error' && (
                        <div className="flex items-center space-x-3 p-4 bg-error-50 border border-error-200 rounded-lg animate-slide-down">
                          <AlertCircleIcon className="h-5 w-5 text-error-500" />
                          <span className="text-sm text-error-700">{errors.root?.message || 'Upload failed. Please try again.'}</span>
                        </div>
                      )}

                      {/* Submit Button */}
                      <div className="flex items-center justify-end space-x-4">
                        <Button variant="ghost" onClick={onClose} type="button">
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          loading={uploadStatus === 'uploading' || isSubmitting}
                          disabled={uploadStatus === 'uploading' || isSubmitting || (selectedResourceType !== 'LINK' && selectedFiles.length === 0)}
                        >
                          Upload Resources
                        </Button>
                      </div>
                    </form>
                  </div>
                </Card> {/* Closing Card tag */}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
