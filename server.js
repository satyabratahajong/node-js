import express from 'express';

const app = express();
const PORT = 3030;

app.use(express.json());

// Quick in-memory store
const books = [
  { id: 1, title: 'Clean Code', author: 'Robert C. Martin', year: 2008, available: true },
  { id: 2, title: 'The Pragmatic Programmer', author: 'Andrew Hunt', year: 1999, available: true }
];
let nextId = 3;

// List books, optional filters: ?title=...&author=...&available=true/false
app.get('/books', (req, res) => {
  const { title, author, available } = req.query;

  let result = [...books];

  if (title) {
    result = result.filter(b =>
      b.title.toLowerCase().includes(title.toLowerCase())
    );
  }

  if (author) {
    result = result.filter(b =>
      b.author.toLowerCase().includes(author.toLowerCase())
    );
  }

  if (available !== undefined) {
    const flag = available === 'true';
    result = result.filter(b => b.available === flag);
  }

  res.json(result);
});

// Get one book
app.get('/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.json(book);
});

// Add a book
app.post('/books', (req, res) => {
  const { title, author, year, available } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: 'title and author are required' });
  }

  const book = {
    id: nextId++,
    title,
    author,
    year: year ? Number(year) : null,
    available: available !== undefined ? Boolean(available) : true
  };

  books.push(book);
  res.status(201).json(book);
});

// Update a book
app.put('/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, author, year, available } = req.body;

  const book = books.find(b => b.id === id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (title !== undefined) book.title = title;
  if (author !== undefined) book.author = author;
  if (year !== undefined) book.year = Number(year);
  if (available !== undefined) book.available = Boolean(available);

  res.json(book);
});

// Delete a book
app.delete('/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = books.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const deleted = books.splice(index, 1)[0];
  res.json(deleted);
});

// Mark a book as borrowed / returned
app.patch('/books/:id/borrow', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (!book.available) {
    return res.status(400).json({ error: 'Book is already borrowed' });
  }

  book.available = false;
  res.json(book);
});

app.patch('/books/:id/return', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (book.available) {
    return res.status(400).json({ error: 'Book is already returned' });
  }

  book.available = true;
  res.json(book);
});

app.listen(PORT, () => {
  console.log(`Library API running at http://localhost:${PORT}`);
});