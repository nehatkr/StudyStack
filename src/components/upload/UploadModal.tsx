// project/src/components/upload/UploadModal.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { UploadIcon, FileIcon, AlertCircleIcon, CheckCircleIcon, Trash2Icon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js'; // Import Supabase client

// Initialize Supabase client
// IMPORTANT: Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Please check your .env file.");
  // You might want to throw an error or handle this more gracefully in a real app
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UploadFormData {
  title: string;
  description: string;
  subject: string;
  resourceType: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ' | 'SYLLABUS';
  semester?: string;
  year?: number;
  isPrivate: boolean;
  allowContact: boolean;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  url?: string;
  isExternal?: boolean;
  tags: string;
  phone?: string; // Not in UI, but kept in type for data consistency if backend expects it.
  contactEmail?: string; // Not in UI, but kept in type for data consistency if backend expects it.
  youtubeChannelName?: string; // Not in UI, but kept in type for data consistency if backend expects it.
  youtubeVideoLink?: string; // Not in UI, but kept in type for data consistency if backend expects it.
  websiteLink?: string; // Not in UI, but kept in type for data consistency if backend expects it.
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
  onUpload: (data: Omit<UploadFormData, 'files' | 'tags'> & { tags: string[] }) => Promise<void>;
  initialResourceType?: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'PPTX' | 'OTHER' | 'LINK' | 'PYQ' | 'SYLLABUS';
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload, initialResourceType }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const { user, isLoading: authLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
  } = useForm<UploadFormData>({
    defaultValues: {
      isPrivate: false,
      allowContact: true,
      resourceType: initialResourceType || 'PDF',
      files: [],
      youtubeChannelName: '', // Initialize even if not in UI
      youtubeVideoLink: '',   // Initialize even if not in UI
      websiteLink: '',        // Initialize even if not in UI
      phone: '',              // Initialize even if not in UI
      contactEmail: '',       // Initialize even if not in UI
    }
  });

  const selectedFiles = watch('files');
  const selectedResourceType = watch('resourceType');
  const watchedYear = watch('year');

  useEffect(() => {
    if (isOpen) {
      reset({
        isPrivate: false,
        allowContact: true,
        resourceType: initialResourceType || 'PDF',
        files: [],
        youtubeChannelName: '',
        youtubeVideoLink: '',
        websiteLink: '',
        phone: '',
        contactEmail: '',
      });
      setUploadStatus('idle');
      setUploadProgress([]);
      clearErrors();
    }
  }, [isOpen, reset, clearErrors, initialResourceType]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    clearErrors('files');
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum file size is 50MB.`);
        return false;
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];

      if (selectedResourceType !== 'LINK' && !allowedTypes.includes(file.type) && selectedResourceType !== 'OTHER' && selectedResourceType !== 'SYLLABUS') {
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
    accept: selectedResourceType === 'LINK' ? {} : {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
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
    clearErrors();

    if (!user?.id) {
      console.error('Uploader ID is missing. User must be logged in.');
      setUploadStatus('error');
      setError('root', { message: 'Authentication error: Uploader ID missing.' });
      return;
    }

    if (selectedResourceType === 'LINK') {
      if (!data.url) {
        setError('url', { message: 'URL is required for Link type resources' });
        return;
      }
      if (data.files && data.files.length > 0) {
        setError('files', { message: 'File uploads are not allowed for Link type resources.' });
        return;
      }
    } else {
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

    const initialProgress = data.files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadProgress(initialProgress);

    try {
      let uploadedFilePath: string | undefined = undefined;
      let uploadedFileName: string | undefined = undefined;
      let uploadedFileSize: number | undefined = undefined;
      let uploadedMimeType: string | undefined = undefined;

      if (selectedResourceType !== 'LINK' && data.files && data.files.length > 0) {
        const file = data.files[0]; // Assuming single file upload for simplicity
        const path = `${user.id}/${Date.now()}-${file.name}`; // Unique path for Supabase Storage

        // Perform actual Supabase Storage upload
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resources') // IMPORTANT: Replace 'resources' with your actual Supabase Storage bucket name
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        // Get public URL of the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from('resources') // IMPORTANT: Replace 'resources' with your actual Supabase Storage bucket name
          .getPublicUrl(path);

        if (publicUrlData?.publicUrl) {
          uploadedFilePath = publicUrlData.publicUrl;
          uploadedFileName = file.name;
          uploadedFileSize = file.size;
          uploadedMimeType = file.type;
        } else {
          throw new Error('Could not get public URL for uploaded file.');
        }

        setUploadProgress(prev =>
          prev.map((item, idx) =>
            idx === 0 ? { ...item, progress: 100, status: 'completed' as const } : item
          )
        );
      } else if (selectedResourceType === 'LINK') {
        // For LINK resources, there's no file upload, just use the URL provided in the form
        uploadedFilePath = data.url; // The URL is the "path" for LINK resources
        uploadedFileName = undefined; // No file name for a pure link
        uploadedFileSize = undefined; // No file size for a pure link
        uploadedMimeType = 'text/uri-list'; // Standard MIME type for links
      }


      const resourceDataForBackend = {
        title: data.title,
        description: data.description,
        subject: data.subject,
        resourceType: data.resourceType,
        semester: data.semester,
        year: data.resourceType === 'PYQ' ? data.year : undefined,
        isPrivate: data.isPrivate,
        allowContact: data.allowContact,
        fileName: uploadedFileName, // This will be the real file name or undefined for LINK
        filePath: uploadedFilePath, // This will be the real Supabase URL or the provided URL for LINK
        fileSize: uploadedFileSize, // This will be the real file size or undefined for LINK
        mimeType: uploadedMimeType, // This will be the real mime type or 'text/uri-list' for LINK
        url: selectedResourceType === 'LINK' ? data.url : undefined, // Ensure URL is sent for LINK type
        isExternal: selectedResourceType === 'LINK',
        tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        // These fields are part of the data model but not present in the UI of this modal as per your request
        phone: undefined,
        contactEmail: undefined,
        youtubeChannelName: undefined,
        youtubeVideoLink: undefined,
        websiteLink: undefined,
      };

      // This calls the onUpload prop (which is handleUpload in App.tsx)
      await onUpload(resourceDataForBackend);

      setUploadStatus('success');

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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                >
                  Upload New Resource
                  <button
                    type="button"
                    className="rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close modal</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                  <Input
                    id="upload-title"
                    label="Title"
                    type="text"
                    placeholder="e.g., Introduction to Calculus"
                    {...register('title', {
                      required: 'Title is required',
                      minLength: { value: 5, message: 'Title must be at least 5 characters' },
                      maxLength: { value: 100, message: 'Title must be less than 100 characters' }
                    })}
                    error={errors.title?.message}
                  />
                  <div className="relative">
                    <label htmlFor="upload-description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="upload-description"
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200 ease-in-out"
                      placeholder="Provide a detailed description of the resource..."
                      {...register('description', {
                        required: 'Description is required',
                        minLength: { value: 10, message: 'Description must be at least 50 characters' },
                        maxLength: { value: 500, message: 'Description must be less than 500 characters' }
                      })}
                    ></textarea>
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                    )}
                  </div>

                  <Input
                    id="upload-subject"
                    label="Subject"
                    type="text"
                    placeholder="e.g., Mathematics, Physics, Chemistry"
                    {...register('subject', { required: 'Subject is required' })}
                    error={errors.subject?.message}
                  />

                  <div>
                    <label htmlFor="resourceType" className="block text-sm font-medium text-gray-700 mb-1">
                      Resource Type
                    </label>
                    <select
                      id="resourceType"
                      className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200 ease-in-out"
                      {...register('resourceType', { required: 'Resource type is required' })}
                      disabled={!initialResourceType}
                    > 
                      <option value="PDF">PDF Document</option>
                      <option value="DOC">Word Document (.doc)</option>
                      <option value="DOCX">Word Document (.docx)</option>
                      <option value="PPT">PowerPoint (.ppt)</option>
                      <option value="PPTX">PowerPoint (.pptx)</option>
                      <option value="PYQ">Previous Year Paper</option>
                      <option value="SYLLABUS">Syllabus</option>
                      <option value="LINK">External Link</option>
                      <option value="OTHER">Other File Type</option>
                    </select>
                    {errors.resourceType && (
                      <p className="mt-1 text-sm text-red-600">{errors.resourceType.message}</p>
                    )}
                  </div>

                  {selectedResourceType === 'PYQ' && (
                    <Input
                      id="upload-year"
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
                    id="upload-semester"
                    label="Semester (Optional)"
                    type="text"
                    placeholder="e.g., Fall 2023, 1st Semester"
                    {...register('semester')}
                    error={errors.semester?.message}
                  />

                  {selectedResourceType === 'LINK' ? (
                    <Input
                      id="upload-url"
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
                  ) : (
                    <>
                      <div
                        {...getRootProps()}
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                          isDragActive
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <input {...getInputProps()} />
                        <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          {isDragActive ? 'Drop files here' : 'Drag & drop files here or click to browse'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Supports PDF, DOC, DOCX, PPT, PPTX (max 50MB each)
                        </p>
                        <Button type="button" variant="outline">
                          Select Files
                        </Button>
                        {errors.files && (
                          <p className="mt-2 text-sm text-red-600">{errors.files.message}</p>
                        )}
                      </div>

                      {selectedFiles.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-medium text-gray-900">Selected Files ({selectedFiles.length})</h3>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl">{getFileIcon(file)}</span>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {uploadProgress.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-medium text-gray-900">Upload Progress</h3>
                          {uploadProgress.map((item, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-900">{item.file.name}</span>
                                <span className="text-sm text-gray-500">{item.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    item.status === 'completed' ? 'bg-green-500' :
                                    item.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <Input
                    id="upload-tags"
                    label="Tags (Comma-separated, Optional)"
                    type="text"
                    placeholder="e.g., math, calculus, notes"
                    {...register('tags')}
                    error={errors.tags?.message}
                    helperText="Separate tags with commas (e.g., exam, practice, solution)"
                  />

                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        {...register('isPrivate')}
                        className="form-checkbox h-5 w-5 text-primary-600 rounded"
                      />
                      <span className="ml-2 text-gray-700">Private Resource</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        {...register('allowContact')}
                        className="form-checkbox h-5 w-5 text-primary-600 rounded"
                      />
                      <span className="ml-2 text-gray-700">Allow Uploader Contact</span>
                    </label>
                  </div>

                  {errors.root && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                      {errors.root.message}
                    </div>
                  )}

                  {uploadStatus === 'success' && (
                    <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
                      Upload successful!
                    </div>
                  )}

                  {uploadStatus === 'error' && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                      Upload failed. Please try again.
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSubmitting || uploadStatus === 'uploading'}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubmitting || uploadStatus === 'uploading'}
                      disabled={isSubmitting || uploadStatus === 'uploading' || (selectedResourceType !== 'LINK' && selectedFiles.length === 0)}
                    >
                      {isSubmitting || uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Resource'}
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
