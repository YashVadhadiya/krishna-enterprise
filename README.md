# Krishna Enterprises

A simple Node.js e-commerce application for **Krishna Enterprises** - a stationery wholesaler, with admin panel, product catalog, and WhatsApp integration.

## Project Overview

This project includes:
- **Backend**: Node.js + Express with MySQL database
- **Frontend**: Public product catalog with cart and WhatsApp ordering
- **Admin Panel**: Protected admin area for product and settings management

## Tech Stack

- **Backend**: Node.js, Express.js, MySQL, JWT, Multer
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Database**: MySQL (port 3300)
- **Messaging**: WhatsApp API integration

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
- `settings` - stores WhatsApp number and other settings

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
│   ├── index.html          # Homepage (product catalog with cart)
│   ├── product.html       # Product detail page
│   ├── cart.html          # Shopping cart page
│   ├── admin.html         # Admin login
│   ├── dashboard.html    # Admin dashboard
│   ├── products.html      # Products management
│   ├── settings.html     # Settings (WhatsApp number)
│   └── uploads/          # Uploaded product images
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                  # Environment variables
├── .gitignore           # Git ignore file
└── README.md             # This file
```

## Features

### Frontend (Public)

#### Product Catalog (index.html)
- Product grid view with images
- **Dynamic Quantity Control** per product:
  - Each product card has +/- buttons to select quantity
  - Select quantity before adding to cart
  - Once added to cart, shows "In Cart: X" label
  - +/- buttons directly update cart quantity when in cart
  - When quantity reaches 1 and click "-", removes from cart automatically
  - "Remove" button appears for products in cart
  - Button changes to "Add More" when product is in cart
  - Quantity synced between catalog and product detail page
- **Add to Cart** functionality
- **View Details** opens product detail page
- Cart count badge in header
- Open cart in new tab

#### Product Detail Page (product.html)
- Full product information with all images
- Image gallery with click to enlarge
- **Dynamic Quantity Control**:
  - Shows "In Cart: X item(s)" when product is in cart
  - +/- buttons directly update cart quantity when in cart
  - When quantity reaches 1 and click "-", removes from cart
  - "Remove" button appears for products in cart
  - Button text changes between "Add to Cart" and "Add More"
- **Get Quote on WhatsApp** button (if configured)
- **Add to Cart** button

#### Shopping Cart (cart.html)
- List all cart items with images and names
- Quantity adjustment with +/- buttons
- Remove item functionality
- Customer details form (Name, Mobile, Shop Name, Address)
- **Send Order to WhatsApp** button
- Cart persists in localStorage

### Admin Panel

- JWT-based authentication
- **Dashboard**: Welcome page
- **Products Management**:
  - Add new products with images (max 5)
  - Edit existing products
  - Delete products (with image cleanup)
  - Toggle active/inactive status
  - Auto-generated slug and SKU
- **Settings**:
  - Configure WhatsApp number for orders

### WhatsApp Integration
- Set WhatsApp number in Admin → Settings
- Individual "Get Quote" buttons on product pages
- Cart checkout sends detailed order message via WhatsApp

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all active products |
| GET | `/api/product/:slug` | Get product by slug |
| GET | `/product/:slug` | Product detail page |
| GET | `/cart` | Cart page |
| GET | `/api/settings` | Get WhatsApp number |

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
| GET | `/api/settings` | Get settings |
| POST | `/api/settings` | Save settings (WhatsApp number) |

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

### Settings Table

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key (always 1) |
| whatsapp_number | VARCHAR(20) | WhatsApp number for orders |
| updated_at | TIMESTAMP | Last update |

## Default Credentials

- **Username**: admin
- **Password**: Qwer!234

## Routes

| URL | Description |
|-----|-------------|
| http://localhost:3001/ | Product catalog |
| http://localhost:3001/product/:slug | Product detail |
| http://localhost:3001/cart | Shopping cart |
| http://localhost:3001/admin | Admin login |
| http://localhost:3001/admin/dashboard-page | Admin dashboard |
| http://localhost:3001/admin/products-page | Products management |
| http://localhost:3001/admin/settings-page | Settings (WhatsApp) |

## WhatsApp Message Format

When customer places order via cart:

```
*New Order from Krishna Enterprises*

*Customer Details:*
Name: John Doe
Mobile: 9876543210
Shop Name: John's Stationery
Address: Mumbai, Maharashtra

*Order Details:*
1. Notebook (SKU: SKU-ABC123) - Qty: 5
2. Pen Set (SKU: SKU-DEF456) - Qty: 10

*Total Items:* 15

Please share the total price and delivery details.
```
