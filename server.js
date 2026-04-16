import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import uploadRouter from './routes/upload.js';
import { deleteFromDrive } from './services/drive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('[Auth] No authorization header');
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('[Auth] No token in header');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('[Auth] Token verify failed:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

const app = express();

app.use(express.json());

// Protected upload routes — require admin JWT
app.use('/api/upload', verifyToken, uploadRouter);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Maximum 5 images allowed.' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

const compressImage = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, ext);
    const tempPath = path.join(dir, base + '_temp.jpg');
    
    await sharp(filePath)
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 60, progressive: true, mozjpeg: true })
      .toFile(tempPath);
    
    try { fs.unlinkSync(filePath); } catch(e) {}
    fs.renameSync(tempPath, filePath.replace(ext, '.jpg'));
    return true;
  } catch (err) {
    console.error('Image compression error:', err);
    return false;
  }
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage, 
  limits: { 
    files: 5,
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
});

const pool = mysql.createPool({
  port: 3300,
  user: 'root',
  password: '123456',
  host: 'localhost',
  database: 'ke_plus'
});

pool.getConnection()
  .then(conn => {
    console.log('Connected to MySQL database');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateSKU() {
  return 'KE-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

app.get('/hello', (req, res) => {
  res.send('Hello from backend!');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/home.html', (req, res) => {
  res.redirect(301, '/');
});

app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

app.get('/about.html', (req, res) => {
  res.redirect(301, '/about');
});

app.get('/contact.html', (req, res) => {
  res.redirect(301, '/contact');
});

app.get('/cart.html', (req, res) => {
  res.redirect(301, '/cart');
});

app.get('/admin.html', (req, res) => {
  res.redirect(301, '/admin');
});

app.get('/dashboard.html', (req, res) => {
  res.redirect(301, '/admin/dashboard');
});

app.get('/products.html', (req, res) => {
  res.redirect(301, '/admin/products');
});

app.get('/settings.html', (req, res) => {
  res.redirect(301, '/admin/settings');
});

app.get('/api/products', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM products';
  let params = [];
  
  if (search) {
    query += ' WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?';
    const searchTerm = `%${search}%`;
    params = [searchTerm, searchTerm, searchTerm];
  }
  
  query += ' ORDER BY created_at DESC';
  pool.query(query, params)
    .then(([results]) => res.json(results))
    .catch(() => res.status(500).json({ message: 'Error fetching products' }));
});

app.get('/api/admin/products', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM products';
  let params = [];
  
  if (search) {
    query += ' WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?';
    const searchTerm = `%${search}%`;
    params = [searchTerm, searchTerm, searchTerm];
  }
  
  query += ' ORDER BY created_at DESC';
  pool.query(query, params)
    .then(([results]) => res.json(results))
    .catch(() => res.status(500).json({ message: 'Error fetching products' }));
});

app.post('/api/admin/products', upload.array('images', 5), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const sku = 'KE-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  let images = [];
  if (req.body.existingImages) {
    try {
      images = typeof req.body.existingImages === 'string' ? JSON.parse(req.body.existingImages) : req.body.existingImages;
    } catch (e) {
      images = [];
    }
  }
  
  if (req.files && req.files.length > 0) {
    const compressPromises = req.files.map(async (file) => {
      const originalPath = file.path;
      await compressImage(originalPath);
      const baseName = path.basename(originalPath, path.extname(originalPath));
      return '/uploads/' + baseName + '.jpg';
    });
    const compressedImages = await Promise.all(compressPromises);
    images = [...images, ...compressedImages];
  }
  
  if (images.length > 5) return res.status(400).json({ message: 'Max 5 images allowed' });
  
  const query = 'INSERT INTO products (name, slug, sku, description, images, is_active) VALUES (?, ?, ?, ?, ?, 1)';
  pool.query(query, [name, slug, sku, description, JSON.stringify(images)])
    .then(([result]) => res.json({ success: true, id: result.insertId }))
    .catch(err => res.status(500).json({ message: 'Error adding product', error: err.message }));
});

app.post('/api/admin/products/:id', upload.array('images', 5), async (req, res) => {
  const { id } = req.params;
  const { name, description, existingImages } = req.body;
  
  let updates = [];
  let params = [];
  
  if (name) {
    updates.push('name = ?');
    params.push(name);
    updates.push('slug = ?');
    params.push(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  
  let allImages = [];
  if (existingImages) {
    try {
      allImages = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
    } catch (e) {
      allImages = [];
    }
  }
  
  if (req.files && req.files.length > 0) {
    const compressPromises = req.files.map(async (file) => {
      const originalPath = file.path;
      await compressImage(originalPath);
      const baseName = path.basename(originalPath, path.extname(originalPath));
      return '/uploads/' + baseName + '.jpg';
    });
    const compressedImages = await Promise.all(compressPromises);
    allImages = [...allImages, ...compressedImages];
  }
  
  if (existingImages !== undefined || (req.files && req.files.length > 0)) {
    updates.push('images = ?');
    params.push(JSON.stringify(allImages));
  }
  
  if (updates.length === 0) return res.status(400).json({ message: 'No updates provided' });
  
  params.push(id);
  const query = 'UPDATE products SET ' + updates.join(', ') + ' WHERE id = ?';
  pool.query(query, params)
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ message: 'Error updating product' }));
});

app.post('/api/admin/products/:id/toggle', (req, res) => {
  const { id } = req.params;
  pool.query('SELECT is_active FROM products WHERE id = ?', [id])
    .then(([results]) => {
      if (!results[0]) return res.status(404).json({ message: 'Product not found' });
      const newStatus = results[0].is_active ? 0 : 1;
      return pool.query('UPDATE products SET is_active = ? WHERE id = ?', [newStatus, id])
        .then(() => res.json({ success: true, is_active: newStatus }));
    })
    .catch(() => res.status(500).json({ message: 'Error' }));
});

app.delete('/api/admin/products/:id', (req, res) => {
  const { id } = req.params;
  
  pool.query('SELECT images FROM products WHERE id = ?', [id])
    .then(([results]) => {
      if (results[0]) {
        try {
          const images = typeof results[0].images === 'string' ? JSON.parse(results[0].images) : results[0].images;
          images.forEach(img => {
            const filePath = path.join(__dirname, 'public', img);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          });
        } catch (e) {}
      }
      return pool.query('DELETE FROM products WHERE id = ?', [id]);
    })
    .then(() => res.json({ success: true }))
    .catch(() => res.status(500).json({ message: 'Error deleting product' }));
});

app.get('/product/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

app.get('/api/product/:slug', (req, res) => {
  const { slug } = req.params;
  const query = 'SELECT * FROM products WHERE slug = ? AND is_active = 1';
  pool.query(query, [slug])
    .then(([results]) => {
      if (!results[0]) return res.status(404).json({ message: 'Product not found' });
      res.json(results[0]);
    })
    .catch(() => res.status(500).json({ message: 'Error fetching product' }));
});

app.get('/admin/dashboard-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/products-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/admin/settings-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/admin/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/api/settings', (req, res) => {
  const query = 'SELECT setting_key, setting_value FROM settings';
  pool.query(query)
    .then(([results]) => {
      const settings = {};
      results.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      res.json(settings);
    })
    .catch(() => res.status(500).json({ message: 'Error fetching settings' }));
});

app.post('/api/settings', verifyToken, (req, res) => {
  const { hero_title, hero_subtitle, whatsapp_number, contact_email, contact_phone, address } = req.body;
  const updates = [];
  const values = [];
  
  if (hero_title !== undefined) { updates.push('setting_value = ?'); values.push(hero_title); }
  if (hero_subtitle !== undefined) { updates.push('setting_value = ?'); values.push(hero_subtitle); }
  if (whatsapp_number !== undefined) { updates.push('setting_value = ?'); values.push(whatsapp_number); }
  if (contact_email !== undefined) { updates.push('setting_value = ?'); values.push(contact_email); }
  if (contact_phone !== undefined) { updates.push('setting_value = ?'); values.push(contact_phone); }
  if (address !== undefined) { updates.push('setting_value = ?'); values.push(address); }
  
  if (updates.length === 0) return res.status(400).json({ message: 'No settings to update' });
  
  const keys = Object.keys(req.body).filter(k => ['hero_title', 'hero_subtitle', 'whatsapp_number', 'contact_email', 'contact_phone', 'address'].includes(k));
  let completed = 0;
  let hasError = false;
  
  keys.forEach(key => {
    const value = req.body[key];
    pool.query('UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?', [value, key])
      .then(() => {
        completed++;
        if (completed === keys.length && !hasError) {
          res.json({ success: true });
        }
      })
      .catch(err => {
        completed++;
        if (!hasError) { hasError = true; res.status(500).json({ message: 'Error saving settings' }); }
      });
  });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, process.env.ADMIN_SECRET);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/admin/dashboard', verifyToken, (req, res) => {
  res.json({ message: 'Welcome to admin dashboard!', user: req.user.username });
});

app.get('/admin/products', verifyToken, (req, res) => {
  const query = 'SELECT * FROM products ORDER BY created_at DESC';
  pool.query(query)
    .then(([results]) => res.json(results))
    .catch(() => res.status(500).json({ message: 'Error fetching products' }));
});

app.post('/admin/products', verifyToken, upload.array('images', 5), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  
  const slug = generateSlug(name);
  const sku = generateSKU();
  
  let images = [];
  if (req.body.existingImages) {
    try {
      images = typeof req.body.existingImages === 'string' ? JSON.parse(req.body.existingImages) : req.body.existingImages;
    } catch (e) {
      images = [];
    }
  }
  if (req.files) {
    for (const file of req.files) {
      await compressImage(file.path);
      const baseName = path.basename(file.path, path.extname(file.path));
      images.push('/uploads/' + baseName + '.jpg');
    }
  }
  if (images.length > 5) return res.status(400).json({ message: 'Max 5 images allowed' });
  
  const query = 'INSERT INTO products (name, slug, sku, description, images, is_active) VALUES (?, ?, ?, ?, ?, 1)';
  pool.query(query, [name, slug, sku, description, JSON.stringify(images)])
    .then(([result]) => res.json({ success: true, id: result.insertId }))
    .catch(err => res.status(500).json({ message: 'Error adding product', error: err.message }));
});

app.post('/admin/products/:id', verifyToken, upload.array('images', 5), async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  let slug = null;
  if (name) {
    slug = generateSlug(name);
  }
  
  let images = [];
  if (req.body.existingImages) {
    try {
      images = typeof req.body.existingImages === 'string' ? JSON.parse(req.body.existingImages) : req.body.existingImages;
    } catch (e) {
      images = [];
    }
  }
  if (req.files) {
    for (const file of req.files) {
      await compressImage(file.path);
      const baseName = path.basename(file.path, path.extname(file.path));
      images.push('/uploads/' + baseName + '.jpg');
    }
  }
  if (images.length > 5) return res.status(400).json({ message: 'Max 5 images allowed' });
  
  const query = slug 
    ? 'UPDATE products SET name = ?, slug = ?, description = ?, images = ? WHERE id = ?'
    : 'UPDATE products SET name = ?, description = ?, images = ? WHERE id = ?';
  const params = slug ? [name, slug, description, JSON.stringify(images), id] : [name, description, JSON.stringify(images), id];
  
  pool.query(query, params)
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ message: 'Error updating product', error: err.message }));
});

app.post('/admin/products/:id/toggle', verifyToken, (req, res) => {
  const { id } = req.params;
  pool.query('SELECT is_active FROM products WHERE id = ?', [id])
    .then(([results]) => {
      if (!results[0]) return res.status(404).json({ message: 'Product not found' });
      const newStatus = results[0].is_active ? 0 : 1;
      return pool.query('UPDATE products SET is_active = ? WHERE id = ?', [newStatus, id])
        .then(() => res.json({ success: true, is_active: newStatus }));
    })
    .catch(() => res.status(500).json({ message: 'Error' }));
});

app.delete('/admin/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await pool.query('SELECT images FROM products WHERE id = ?', [id]);
    
    if (rows.length > 0 && rows[0].images) {
      try {
        const images = typeof rows[0].images === 'string' ? JSON.parse(rows[0].images) : rows[0].images;
        for (const img of images) {
          if (img) {
            const filePath = path.join(__dirname, 'public', img);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          }
        }
      } catch (e) {}
    }
    
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});