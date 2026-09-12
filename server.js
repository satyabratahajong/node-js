import express from 'express';

const app = express();
const PORT = 3010;

app.use(express.json());

// In-memory "DB"
const posts = [];   // { id, title, content, createdAt }
const comments = []; // { id, postId, author, content, createdAt }
let nextPostId = 1;
let nextCommentId = 1;

// ---------- Posts ----------

// GET /posts
app.get('/posts', (req, res) => {
  const list = posts.map(p => ({
    ...p,
    commentCount: comments.filter(c => c.postId === p.id).length
  }));
  res.json(list);
});

// GET /posts/:id
app.get('/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const post = posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const postComments = comments.filter(c => c.postId === id);
  res.json({ ...post, comments: postComments });
});

// POST /posts
app.post('/posts', (req, res) => {
  const { title, content } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const post = {
    id: nextPostId++,
    title,
    content: content || '',
    createdAt: new Date().toISOString()
  };

  posts.push(post);
  res.status(201).json(post);
});

// PUT /posts/:id
app.put('/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, content } = req.body;

  const post = posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (title !== undefined) post.title = title;
  if (content !== undefined) post.content = content;

  res.json(post);
});

// DELETE /posts/:id
app.delete('/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = posts.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Also delete related comments
  const deletedPost = posts.splice(index, 1)[0];
  const indices = comments
    .map((c, i) => (c.postId === id ? i : -1))
    .filter(i => i !== -1)
    .sort((a, b) => b - a);

  for (const i of indices) {
    comments.splice(i, 1);
  }

  res.json(deletedPost);
});

// ---------- Comments ----------

// POST /posts/:postId/comments
app.post('/posts/:postId/comments', (req, res) => {
  const postId = Number(req.params.postId);
  const { author, content } = req.body;

  const post = posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  const comment = {
    id: nextCommentId++,
    postId,
    author: author || 'Anonymous',
    content,
    createdAt: new Date().toISOString()
  };

  comments.push(comment);
  res.status(201).json(comment);
});

// PUT /comments/:id
app.put('/comments/:id', (req, res) => {
  const id = Number(req.params.id);
  const { author, content } = req.body;

  const comment = comments.find(c => c.id === id);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  if (author !== undefined) comment.author = author;
  if (content !== undefined) comment.content = content;

  res.json(comment);
});

// DELETE /comments/:id
app.delete('/comments/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = comments.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const deleted = comments.splice(index, 1)[0];
  res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`Blog API running at http://localhost:${PORT}`);
});