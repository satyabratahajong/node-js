const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// In-memory database
let books = [
  { id: 1, title: 'Clean Code', author: 'Robert Martin', price: 39.99, stock: 50 },
  { id: 2, title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', price: 49.99, stock: 30 },
  { id: 3, title: 'Design Patterns', author: 'Gang of Four', price: 54.99, stock: 25 }
];

let nextId = 4;

// GET all books
app.get('/api/books', (req, res) => {
  res.json(books);
});

// GET single book
app.get('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === parseInt(req.params.id));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

// POST create book
app.post('/api/books', (req, res) => {
  const { title, author, price, stock } = req.body;
  
  if (!title || !author || !price) {
    return res.status(400).json({ error: 'Title, author, and price required' });
  }

  const newBook = {
    id: nextId++,
    title,
    author,
    price: parseFloat(price),
    stock: parseInt(stock) || 0
  };

  books.push(newBook);
  res.status(201).json(newBook);
});

// PUT update book
app.put('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === parseInt(req.params.id));
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const { title, author, price, stock } = req.body;
  if (title) book.title = title;
  if (author) book.author = author;
  if (price) book.price = parseFloat(price);
  if (stock !== undefined) book.stock = parseInt(stock);

  res.json(book);
});

// DELETE book
app.delete('/api/books/:id', (req, res) => {
  const index = books.findIndex(b => b.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Book not found' });

  books.splice(index, 1);
  res.json({ message: 'Book deleted' });
});

app.listen(PORT, () => {
  console.log(`📚 BookStore API running on http://localhost:${PORT}`);
});