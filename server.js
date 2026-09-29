const express = require('express');
const { createClient } = require('redis');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3081;

app.use(cors());
app.use(express.json());

// Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Error:', err));

// In-memory data (simulate database)
let products = [
  { id: 1, name: 'Laptop', price: 999, category: 'Electronics', stock: 50 },
  { id: 2, name: 'Mouse', price: 29, category: 'Electronics', stock: 200 },
  { id: 3, name: 'Desk Chair', price: 199, category: 'Furniture', stock: 30 },
  { id: 4, name: 'Notebook', price: 5, category: 'Stationery', stock: 500 },
  { id: 5, name: 'Pen Set', price: 12, category: 'Stationery', stock: 150 },
];

// Cache helper functions
const getCache = async (key) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

const setCache = async (key, data, ttl = 300) => {
  await redisClient.setEx(key, ttl, JSON.stringify(data));
};

const invalidateCache = async (pattern) => {
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

// Initialize Redis connection
async function init() {
  await redisClient.connect();
  console.log('Connected to Redis');
}

// GET all products (cached)
app.get('/api/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    const cacheKey = `products:${category || 'all'}:${search || 'all'}`;

    // Try cache first
    let cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Filter products
    let result = products;
    if (category) result = result.filter(p => p.category === category);
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(term));
    }

    // Cache for 5 minutes
    await setCache(cacheKey, result, 300);

    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single product (cached)
app.get('/api/products/:id', async (req, res) => {
  try {
    const cacheKey = `product:${req.params.id}`;

    let cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await setCache(cacheKey, product, 300);

    res.setHeader('X-Cache', 'MISS');
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create product (invalidate cache)
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, category, stock } = req.body;
    const id = products.length + 1;
    const product = { id, name, price, category, stock };
    products.push(product);

    // Invalidate all product caches
    await invalidateCache('product:*');
    await invalidateCache('products:*');

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update product (invalidate cache)
app.put('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });

    products[index] = { ...products[index], ...req.body };

    // Invalidate specific product cache and list caches
    await redisClient.del(`product:${id}`);
    await invalidateCache('products:*');

    res.json(products[index]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE product (invalidate cache)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });

    products.splice(index, 1);

    await redisClient.del(`product:${id}`);
    await invalidateCache('products:*');

    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cache stats
app.get('/api/cache/stats', async (req, res) => {
  try {
    const keys = await redisClient.keys('product:*');
    const productKeys = await redisClient.keys('products:*');
    
    res.json({
      cachedProducts: keys.length,
      cachedLists: productKeys.length,
      totalKeys: keys.length + productKeys.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Redis error' });
  }
});

// Clear all cache
app.delete('/api/cache/clear', async (req, res) => {
  try {
    await invalidateCache('product:*');
    await invalidateCache('products:*');
    res.json({ message: 'Cache cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Redis error' });
  }
});

app.get('/health', async (req, res) => {
  res.json({ 
    status: 'ok', 
    redisConnected: redisClient.isOpen,
    productsCount: products.length
  });
});

init().then(() => {
  app.listen(PORT, () => {
    console.log(`Cached API running on http://localhost:${PORT}`);
  });
});