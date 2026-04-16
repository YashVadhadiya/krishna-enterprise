import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadToDrive } from '../services/drive.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMP_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename:    (req, file, cb) => cb(null, `${uuidv4()}-original${path.extname(file.originalname)}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`[Cleanup] Failed to delete: ${filePath}`, err.message);
    }
  }
}

async function processImage(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 60, progressive: true, mozjpeg: true })
    .toFile(outputPath.replace('.webp', '.jpg'));
}

router.post('/image', upload.single('image'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file provided.' });
  }

  const originalPath = req.file.path;
  const processedName = `ke-${uuidv4()}.jpg`;
  const processedPath = path.join(TEMP_DIR, processedName);

  try {
    await processImage(originalPath, processedPath);
    const { fileId, imageUrl } = await uploadToDrive(processedPath, processedName);
    res.json({ success: true, fileId, imageUrl });
  } catch (err) {
    console.error('[Upload] Single image error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupFile(originalPath);
    cleanupFile(processedPath);
  }
});

router.post('/images', upload.array('images', 5), async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No image files provided.' });
  }

  const results  = [];
  const errors   = [];
  const tempFiles = [];

  for (const file of req.files) {
    const originalPath  = file.path;
    const processedName = `ke-${uuidv4()}.jpg`;
    const processedPath = path.join(TEMP_DIR, processedName);
    tempFiles.push(originalPath, processedPath);

    try {
      await processImage(originalPath, processedPath);
      const { fileId, imageUrl } = await uploadToDrive(processedPath, processedName);
      results.push({ fileId, imageUrl });
      console.log(`[Upload] Success: ${processedName}`);
    } catch (err) {
      console.error(`[Upload] Failed for ${file.originalname}:`, err.message);
      errors.push({ file: file.originalname, error: err.message });
    }
  }

  tempFiles.forEach(cleanupFile);

  if (results.length === 0) {
    return res.status(500).json({ success: false, error: errors[0]?.error || 'All uploads failed.', errors });
  }

  res.json({
    success: true,
    uploaded: results.length,
    failed:   errors.length,
    images:   results,
    errors:   errors.length > 0 ? errors : undefined,
  });
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Maximum size is 15MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, error: 'Maximum 5 images allowed.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
});

export default router;