
import multer from 'multer'; 
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises'; 
import { createClient } from '@supabase/supabase-js'; // Import Supabase client for storage operations

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);


const uploadsDir = path.join(__dirname, '..', '..', 'uploads'); // Go up from middleware, then up from src, then into uploads

// Ensure the uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log(`Ensured uploads directory exists at: ${uploadsDir}`);
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
};
ensureUploadsDir(); 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine user-specific folder for temp uploads
    const userId = req.user?.id || 'anonymous'; // Get user ID from authenticated request
    const userUploadPath = path.join(uploadsDir, userId);

    fs.mkdir(userUploadPath, { recursive: true })
      .then(() => cb(null, userUploadPath))
      .catch(err => cb(err, null));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX are allowed.'));
    }
  }
});

// Middleware for single file upload
export const uploadSingle = (req, res, next) => {
  // If it's a LINK type resource, we don't need Multer to process a file.
  if (req.body.resourceType === 'LINK') {
    return next();
  }

  upload.single('file')(req, res, async (err) => { // 'file' is the field name from the frontend form
    if (err instanceof multer.MulterError) {
      console.error('Multer error during file upload:', err);
      return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
    } else if (err) {
      console.error('Generic file upload error:', err);
      return res.status(500).json({ success: false, message: `File upload error: ${err.message}` });
    }

    // If a file was uploaded, upload it to Supabase Storage
    if (req.file) {
      try {
        const userId = req.user?.id || 'anonymous'; // Get user ID from authenticated request
        const fileBuffer = await fs.readFile(req.file.path); // Read the temporarily saved file

        const { data, error: uploadError } = await supabaseAdmin.storage
          .from('resources') // Your bucket name
          .upload(`${userId}/${req.file.filename}`, fileBuffer, {
            contentType: req.file.mimetype,
            upsert: false // Set to true if you want to overwrite existing files
          });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
          // Clean up local temp file on Supabase upload failure
          await fs.unlink(req.file.path);
          return res.status(500).json({ success: false, message: `Failed to upload file to storage: ${uploadError.message}` });
        }

        // Update req.file.path to be the Supabase Storage path for later use in resourceRoutes
        req.file.path = data.path; // This is the path within the bucket (e.g., 'user_id/filename.pdf')
        console.log('File successfully uploaded to Supabase Storage:', req.file.path);

        // Clean up the local temporary file after successful Supabase upload
        await fs.unlink(req.file.path); // This will be the local temp path
        console.log('Local temp file cleaned up:', req.file.path);

      } catch (storageProcessError) {
        console.error('Error during Supabase storage processing:', storageProcessError);
        // Ensure local temp file is cleaned up if anything goes wrong during Supabase upload process
        if (req.file && await fs.access(req.file.path).then(() => true).catch(() => false)) { // Check if file still exists
          await fs.unlink(req.file.path).catch(err => console.error('Error cleaning up temp file:', err));
        }
        return res.status(500).json({ success: false, message: `Failed to process file for storage: ${storageProcessError.message}` });
      }
    }
    next();
  });
};

export const deleteFile = async (filePath) => {
  console.warn(`deleteFile: Attempting to delete file from Supabase Storage: ${filePath}`);
  try {
    // filePath from DB should be the path within the bucket (e.g., 'user_id/filename.pdf')
    const { error: storageError } = await supabaseAdmin.storage
      .from('resources') // Your bucket name
      .remove([filePath]); // Pass the path within the bucket

    if (storageError) {
      console.error('Supabase Storage deletion error:', storageError);
      throw new Error(`Failed to delete file from storage: ${storageError.message}`);
    }
    console.log(`Successfully deleted file from Supabase Storage: ${filePath}`);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    throw error; // Re-throw to indicate failure
  }
};

export const getFileInfo = (file) => {
  console.warn('getFileInfo: Extracting actual file info from Multer result.');
  if (!file) {
    return { originalName: null, path: null, size: null, mimetype: null };
  }
  return {
    originalName: file.originalname,
    path: file.path, // This is now the Supabase Storage path from uploadSingle
    size: file.size,
    mimetype: file.mimetype
  };
};