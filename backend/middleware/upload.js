import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadDirs = ['photos', 'videos'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', 'uploads', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const isVideo = file.mimetype.startsWith('video/');
    const folder = isVideo ? 'videos' : 'photos';
    cb(null, path.join(__dirname, '..', 'uploads', folder));
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  }
  // Accept videos
  else if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  }
  else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Upload single photo
export const uploadPhoto = upload.single('photo');

// Upload multiple photos
export const uploadPhotos = upload.array('photos', 10);

// Upload single video
export const uploadVideo = upload.single('video');

// Upload mixed (photos and videos)
export const uploadMedia = upload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]);

// Error handler for multer
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next();
};

// Helper to get file URL
export const getFileUrl = (req, filename, type = 'photos') => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/${type}/${filename}`;
};

export default upload;
