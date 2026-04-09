# KE2 E-Commerce Project

A simple Node.js e-commerce application with admin panel and frontend product catalog.

## Project Overview

This project includes:
- **Backend**: Node.js + Express with MySQL database
- **Frontend**: Public product catalog
- **Admin Panel**: Protected admin area for product management (CRUD)

## Tech Stack

- **Backend**: Node.js, Express.js, MySQL, JWT, Multer
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Database**: MySQL (port 3300)

## Getting Started

### Prerequisites

- Node.js installed
- MySQL installed and running on port 3300

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Database Setup

The database `ke_plus` will be created automatically on first run. Tables:
- `products` - stores product information

### Configuration

Edit `.env` file:
```
ADMIN_USER=admin
ADMIN_PASSWORD=Qwer!234
ADMIN_SECRET=2f6771ab-2144-46bd-b872-96deb3a3759d
```

### Run the Server

```bash
npm start
```

Server runs on: **http://localhost:3001**

## Project Structure

```
KE2/
├── public/
│   ├── index.html          # Homepage (product catalog)
│   ├── product.html        # Product detail page
│   ├── admin.html          # Admin login
│   ├── dashboard.html     # Admin dashboard
│   ├── products.html       # Products management
│   └── uploads/           # Uploaded product images
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                   # Environment variables
├── .gitignore            # Git ignore file
└── README.md             # This file
```

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all active products |
| GET | `/api/product/:slug` | Get product by slug |
| GET | `/product/:slug` | Product detail page |

### Admin (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/login` | Admin login |
| GET | `/admin/dashboard` | Dashboard data |
| GET | `/admin/products` | List all products |
| POST | `/admin/products` | Add new product |
| POST | `/admin/products/:id` | Update product |
| POST | `/admin/products/:id/toggle` | Toggle active status |
| DELETE | `/admin/products/:id` | Delete product |

## Features

### Frontend (Public)
- Product catalog grid view
- Product detail page with all images
- Only shows active products
- Responsive design

### Admin Panel
- JWT-based authentication
- Product CRUD operations
- Image upload (max 5 per product)
- Auto-generated slug and SKU
- Active/Inactive toggle switch
- Table view for products

## Database Schema

### Products Table

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(255) | Product name |
| slug | VARCHAR(255) | URL-friendly slug (unique) |
| sku | VARCHAR(100) | Auto-generated SKU (unique) |
| description | TEXT | Product description |
| images | JSON | Array of image URLs |
| is_active | TINYINT(1) | Active status (1/0) |
| created_at | TIMESTAMP | Creation date |
| updated_at | TIMESTAMP | Last update |

## Default Credentials

- **Username**: admin
- **Password**: Qwer!234

## Routes

| URL | Description |
|-----|-------------|
| http://localhost:3001/ | Product catalog |
| http://localhost:3001/product/:slug | Product detail |
| http://localhost:3001/admin | Admin login |
| http://localhost:3001/admin/dashboard-page | Admin dashboard |
| http://localhost:3001/admin/products-page | Products management |
