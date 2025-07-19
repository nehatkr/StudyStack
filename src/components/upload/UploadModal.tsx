import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { X, Upload, File, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { UploadProgress } from '../../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: UploadFormData) => void;
}

interface UploadFormData {
  title: string;
  description: string;
  category: string;
  tags: string;
  isPrivate: boolean;
  allowContact: boolean;
  files: File[];
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<UploadFormData>({
    defaultValues: {
      isPrivate: false,
      allowContact: true,
    }
  });

  const selectedFiles = watch('files') || [];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum file size is 50MB.`);
        return false;
      }
      
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name} is not a supported file type. Please upload PDF, DOC, DOCX, PPT, or PPTX files.`);
        return false;
      }
      
      return true;
    });

    const currentFiles = selectedFiles || [];
    setValue('files', [...currentFiles, ...validFiles]);
  }, [selectedFiles, setValue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
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
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!data.files || data.files.length === 0) {
      alert('Please select at least one file');
      return;
    }

    setUploadStatus('uploading');
    
    // Initialize progress tracking
    const initialProgress = data.files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadProgress(initialProgress);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => 
          prev.map(item => ({
            ...item,
            progress: i,
          }))
        );
      }

      // Mark as completed
      setUploadProgress(prev => 
        prev.map(item => ({
          ...item,
          status: 'completed' as const,
        }))
      );

      const formData = {
        ...data,
        tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).join(','),
      };
      
      onUpload(formData);
      setUploadStatus('success');
      
      // Reset form after successful upload
      setTimeout(() => {
        reset();
        setUploadStatus('idle');
        setUploadProgress([]);
        onClose();
      }, 2000);
    } catch (error) {
      setUploadStatus('error');
      setUploadProgress(prev => 
        prev.map(item => ({
          ...item,
          status: 'error' as const,
        }))
      );
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              Upload Resources
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-200 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-secondary-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* File Upload Area */}
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                isDragActive
                  ? 'border-secondary-500 bg-secondary-50'
                  : 'border-background-400 hover:border-secondary-400 hover:bg-background-50'
              }`}
            >
              <input {...getInputProps()} />
              
              <Upload className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-black mb-2">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here or click to browse'}
              </p>
              <p className="text-sm text-secondary-500 mb-4">
                Supports PDF, DOC, DOCX, PPT, PPTX (max 50MB each)
              </p>
              <Button type="button" variant="outline">
                Select Files
              </Button>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
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
                        <Trash2 className="h-4 w-4" />
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
                  Category
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="w-full px-3 py-2 bg-card-500 border border-background-400 rounded-lg text-black focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select a category</option>
                  <option value="computer-science">Computer Science</option>
                  <option value="mathematics">Mathematics</option>
                  <option value="physics">Physics</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="biology">Biology</option>
                  <option value="engineering">Engineering</option>
                  <option value="business">Business</option>
                  <option value="literature">Literature</option>
                </select>
                {errors.category && (
                  <p className="text-sm text-error-500 mt-1">{errors.category.message}</p>
                )}
              </div>

              <Input
                label="Tags"
                placeholder="e.g., algorithms, data structures, programming"
                {...register('tags')}
                error={errors.tags?.message}
                helperText="Separate tags with commas (maximum 5 tags)"
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

            {/* Upload Status */}
            {uploadStatus === 'success' && (
              <div className="flex items-center space-x-3 p-4 bg-success-50 border border-success-200 rounded-lg animate-slide-down">
                <CheckCircle className="h-5 w-5 text-success-500" />
                <span className="text-sm text-success-700">Upload successful!</span>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="flex items-center space-x-3 p-4 bg-error-50 border border-error-200 rounded-lg animate-slide-down">
                <AlertCircle className="h-5 w-5 text-error-500" />
                <span className="text-sm text-error-700">Upload failed. Please try again.</span>
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
                loading={uploadStatus === 'uploading'}
                disabled={!selectedFiles.length}
              >
                Upload Resources
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};