import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function uploadToDrive(filePath, fileName) {
  const destPath = path.join(UPLOAD_DIR, fileName);
  fs.copyFileSync(filePath, destPath);
  
  const imageUrl = `/uploads/${fileName}`;
  console.log(`[Drive] Uploaded: ${fileName} → ${imageUrl}`);
  
  return { fileId: fileName, imageUrl };
}

export async function deleteFromDrive(fileId) {
  const filePath = path.join(UPLOAD_DIR, fileId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[Drive] Deleted: ${fileId}`);
  }
}