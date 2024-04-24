require('dotenv').config();

// Now you can access environment variables using process.env
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// Create a MySQL connection pool using environment variables
//const pool = mysql.createPool({
 // host: process.env.DB_HOST,
 // user: process.env.DB_USER,
  //password: process.env.DB_PASSWORD,
  //database: process.env.DB_NAME,
  //waitForConnections: true,
  //connectionLimit: 10,
  //queueLimit: 0
//});
const pool = mysql.createPool({
  host: process.env.DB_HOST, // Replace 'remote_host_address' with the actual IP address or hostname of your remote MySQL server
  user: process.env.DB_USER, // Replace 'remote_username' with your remote MySQL username
  password: process.env.DB_PASSWORD, // Replace 'remote_password' with your remote MySQL password
  database: process.env.DB_NAME, // Replace 'remote_database_name' with the name of your remote MySQL database
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, c.name AS category_name, b.name AS brand_name, p.title, p.price, p.image_url, p.info 
      FROM products p 
      JOIN brands b ON p.brand_id = b.id 
      JOIN categories c ON b.category_id = c.id
    `);

    const productsByCategory = {};

    rows.forEach(row => {
      const { category_name, brand_name, title, price, image_url, info } = row;
      if (!productsByCategory[category_name]) {
        productsByCategory[category_name] = { name: category_name, brands: {} };
      }
      if (!productsByCategory[category_name].brands[brand_name]) {
        productsByCategory[category_name].brands[brand_name] = { name: brand_name, items: [] };
      }
      productsByCategory[category_name].brands[brand_name].items.push({
        title,
        price: parseFloat(price).toFixed(2),
        image: { fields: { file: { url: image_url } } },
        info
      });
    });

    // Define the preferred order of categories
    const preferredOrder = ['Skin Care Products', 'Hair Products', 'Make-Up Products', 'Accessories'];

    // Sort the categories based on the preferred order
    const sortedCategories = preferredOrder.map(category => {
      return productsByCategory[category];
    });

    const response = { categories: sortedCategories };

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new product
app.post('/products', async (req, res) => {
  const { title, price, image_url, brand_id, info } = req.body;
  try {
    await pool.query('INSERT INTO products (title, price, image_url, brand_id, info) VALUES (?, ?, ?, ?, ?)', [title, price, image_url, brand_id, info]);
    res.status(201).json({ message: 'Product added successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a product
app.delete('/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [productId]);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Delete a product by name

app.delete('/products', async (req, res) => {
  const productName = req.body.name;
  try {
      // Use product name to delete the product from the database
      await pool.query('DELETE FROM products WHERE name = ?', [productName]);
      res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});



// Update a product
app.put('/products/:id', async (req, res) => {
  const productId = req.params.id;
  const { title, price, image_url, brand_id, info } = req.body;
  try {
    await pool.query('UPDATE products SET title = ?, price = ?, image_url = ?, brand_id = ?, info = ? WHERE id = ?', [title, price, image_url, brand_id, info, productId]);
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Get all categories
app.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories');
    res.json(rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new category
app.post('/categories', async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ message: 'Category added successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a category
app.delete('/categories/:id', async (req, res) => {
  const categoryId = req.params.id;
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a category
app.put('/categories/:id', async (req, res) => {
  const categoryId = req.params.id;
  const { name } = req.body;
  try {
    await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, categoryId]);
    res.status(200).json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all brands
app.get('/brands', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM brands');
    res.json(rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Add a new brand
app.post('/brands', async (req, res) => {
  const { name, category_id } = req.body;
  console.log('Received data:', { name, category_id }); // Log received data
  try {
    // Check if categoryId is provided and not null
    if (!category_id) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    // Add the brand to the database
    await pool.query('INSERT INTO brands (name, category_id) VALUES (?, ?)', [name, category_id]);
    res.status(201).json({ message: 'Brand added successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a brand
app.put('/brands/:id', async (req, res) => {
  const brandId = req.params.id;
  const { name, category_id } = req.body;

  try {
    // Check if the provided categoryId exists in the categories table
    const [category] = await pool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (!category) {
      return res.status(400).json({ error: 'Invalid categoryId. Category does not exist.' });
    }

    // Update the brand
    await pool.query('UPDATE brands SET name = ?, category_id = ? WHERE id = ?', [name, category_id, brandId]);
    res.status(200).json({ message: 'Brand updated successfully' });
  } catch (error) {
    console.error('MySQL Error:', error.sqlMessage); // Log the specific SQL error message
    res.status(500).json({ error: 'Error updating brand. Please check your input data.' });
  }
});


// Delete a brand
app.delete('/brands/:id', async (req, res) => {
  const brandId = req.params.id;
  try {
    await pool.query('DELETE FROM brands WHERE id = ?', [brandId]);
    res.status(200).json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
