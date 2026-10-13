const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const POSTS_DIR = path.join(__dirname, 'posts');

// Ensure the posts directory exists
if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR);
}

// Get list of all post slugs
app.get('/api/posts', (req, res) => {
  fs.readdir(POSTS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Unable to read posts directory' });
    const posts = files.filter(file => file.endsWith('.md')).map(file => file.replace('.md', ''));
    res.json({ posts });
  });
});

// Get content of a specific post by slug
app.get('/api/posts/:slug', (req, res) => {
  const filePath = path.join(POSTS_DIR, `${req.params.slug}.md`);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'Blog post not found' });
    res.json({ slug: req.params.slug, content: data });
  });
});

app.listen(3000, () => console.log('Markdown Blog API running on http://localhost:3000'));
