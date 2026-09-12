import express from 'express';

const app = express();
const PORT = 3020;

app.use(express.json());

// In-memory "DB"
const boards = [];     // { id, title, createdAt }
const lists = [];      // { id, boardId, title, position }
const cards = [];      // { id, listId, title, description, position }
let nextBoardId = 1;
let nextListId = 1;
let nextCardId = 1;

// ---------- Boards ----------

// GET /boards
app.get('/boards', (req, res) => {
  res.json(boards);
});

// GET /boards/:id
app.get('/boards/:id', (req, res) => {
  const id = Number(req.params.id);
  const board = boards.find(b => b.id === id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const boardLists = lists
    .filter(l => l.boardId === id)
    .sort((a, b) => a.position - b.position)
    .map(l => ({
      ...l,
      cards: cards
        .filter(c => c.listId === l.id)
        .sort((a, b) => a.position - b.position)
    }));

  res.json({ ...board, lists: boardLists });
});

// POST /boards
app.post('/boards', (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const board = {
    id: nextBoardId++,
    title,
    createdAt: new Date().toISOString()
  };

  boards.push(board);
  res.status(201).json(board);
});

// PUT /boards/:id
app.put('/boards/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title } = req.body;

  const board = boards.find(b => b.id === id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  if (title !== undefined) board.title = title;

  res.json(board);
});

// DELETE /boards/:id
app.delete('/boards/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = boards.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Board not found' });
  }

  // Delete related lists and cards
  const deletedBoard = boards.splice(index, 1)[0];

  const listIds = lists.filter(l => l.boardId === id).map(l => l.id);
  const li = lists
    .map((l, i) => (l.boardId === id ? i : -1))
    .filter(i => i !== -1)
    .sort((a, b) => b - a);

  for (const i of li) {
    lists.splice(i, 1);
  }

  const ci = cards
    .map((c, i) => (listIds.includes(c.listId) ? i : -1))
    .filter(i => i !== -1)
    .sort((a, b) => b - a);

  for (const i of ci) {
    cards.splice(i, 1);
  }

  res.json(deletedBoard);
});

// ---------- Lists ----------

// POST /boards/:boardId/lists
app.post('/boards/:boardId/lists', (req, res) => {
  const boardId = Number(req.params.boardId);
  const { title } = req.body;

  const board = boards.find(b => b.id === boardId);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const maxPos = lists
    .filter(l => l.boardId === boardId)
    .reduce((max, l) => Math.max(max, l.position), -1);

  const list = {
    id: nextListId++,
    boardId,
    title,
    position: maxPos + 1
  };

  lists.push(list);
  res.status(201).json(list);
});

// PUT /lists/:id
app.put('/lists/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title } = req.body;

  const list = lists.find(l => l.id === id);
  if (!list) {
    return res.status(404).json({ error: 'List not found' });
  }

  if (title !== undefined) list.title = title;

  res.json(list);
});

// DELETE /lists/:id
app.delete('/lists/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = lists.findIndex(l => l.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'List not found' });
  }

  const deletedList = lists.splice(index, 1)[0];

  // Delete related cards
  const ci = cards
    .map((c, i) => (c.listId === deletedList.id ? i : -1))
    .filter(i => i !== -1)
    .sort((a, b) => b - a);

  for (const i of ci) {
    cards.splice(i, 1);
  }

  res.json(deletedList);
});

// ---------- Cards ----------

// POST /lists/:listId/cards
app.post('/lists/:listId/cards', (req, res) => {
  const listId = Number(req.params.listId);
  const { title, description } = req.body;

  const list = lists.find(l => l.id === listId);
  if (!list) {
    return res.status(404).json({ error: 'List not found' });
  }

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const maxPos = cards
    .filter(c => c.listId === listId)
    .reduce((max, c) => Math.max(max, c.position), -1);

  const card = {
    id: nextCardId++,
    listId,
    title,
    description: description || '',
    position: maxPos + 1
  };

  cards.push(card);
  res.status(201).json(card);
});

// PUT /cards/:id
app.put('/cards/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, description } = req.body;

  const card = cards.find(c => c.id === id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  if (title !== undefined) card.title = title;
  if (description !== undefined) card.description = description;

  res.json(card);
});

// DELETE /cards/:id
app.delete('/cards/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = cards.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const deleted = cards.splice(index, 1)[0];
  res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`Project Board API running at http://localhost:${PORT}`);
});