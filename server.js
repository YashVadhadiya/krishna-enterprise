require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();

app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { files: 5 } });

const db = mysql.createConnection({
  port: 3300,
  user: 'root',
  password: '123456',
  host: 'localhost',
  database: 'ke_plus'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateSKU() {
  return 'SKU-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

app.get('/hello', (req, res) => {
  res.send('Hello from backend!');
});

app.get('/api/products', (req, res) => {
  const query = 'SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching products' });
    res.json(results);
  });
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
  db.query(query, [slug], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching product' });
    if (!results[0]) return res.status(404).json({ message: 'Product not found' });
    res.json(results[0]);
  });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/dashboard-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin/products-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/admin/settings-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/api/settings', (req, res) => {
  db.query('SELECT whatsapp_number FROM settings WHERE id = 1', (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching settings' });
    res.json({ whatsapp_number: results[0]?.whatsapp_number || '' });
  });
});

app.post('/api/settings', verifyToken, (req, res) => {
  const { whatsapp_number } = req.body;
  db.query('UPDATE settings SET whatsapp_number = ? WHERE id = 1', [whatsapp_number], (err) => {
    if (err) return res.status(500).json({ message: 'Error saving settings' });
    res.json({ success: true });
  });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, process.env.ADMIN_SECRET, { expiresIn: '24h' });
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
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching products' });
    res.json(results);
  });
});

app.post('/admin/products', verifyToken, upload.array('images', 5), (req, res) => {
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
    req.files.forEach(file => {
      images.push('/uploads/' + file.filename);
    });
  }
  if (images.length > 5) return res.status(400).json({ message: 'Max 5 images allowed' });
  
  const query = 'INSERT INTO products (name, slug, sku, description, images, is_active) VALUES (?, ?, ?, ?, ?, 1)';
  db.query(query, [name, slug, sku, description, JSON.stringify(images)], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error adding product', error: err.message });
    res.json({ success: true, id: result.insertId });
  });
});

app.post('/admin/products/:id', verifyToken, upload.array('images', 5), (req, res) => {
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
    req.files.forEach(file => {
      images.push('/uploads/' + file.filename);
    });
  }
  if (images.length > 5) return res.status(400).json({ message: 'Max 5 images allowed' });
  
  const query = slug 
    ? 'UPDATE products SET name = ?, slug = ?, description = ?, images = ? WHERE id = ?'
    : 'UPDATE products SET name = ?, description = ?, images = ? WHERE id = ?';
  const params = slug ? [name, slug, description, JSON.stringify(images), id] : [name, description, JSON.stringify(images), id];
  
  db.query(query, params, (err) => {
    if (err) return res.status(500).json({ message: 'Error updating product', error: err.message });
    res.json({ success: true });
  });
});

app.post('/admin/products/:id/toggle', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query('SELECT is_active FROM products WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error' });
    if (!results[0]) return res.status(404).json({ message: 'Product not found' });
    
    const newStatus = results[0].is_active ? 0 : 1;
    db.query('UPDATE products SET is_active = ? WHERE id = ?', [newStatus, id], (err) => {
      if (err) return res.status(500).json({ message: 'Error updating status' });
      res.json({ success: true, is_active: newStatus });
    });
  });
});

app.delete('/admin/products/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  
  db.query('SELECT images FROM products WHERE id = ?', [id], (err, results) => {
    if (results[0]) {
      try {
        const images = typeof results[0].images === 'string' ? JSON.parse(results[0].images) : results[0].images;
        images.forEach(img => {
          const filePath = path.join(__dirname, 'public', img);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      } catch (e) {}
    }
    
    db.query('DELETE FROM products WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ message: 'Error deleting product' });
      res.json({ success: true });
    });
  });
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
