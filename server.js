const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const app = express();
const PORT = 3006;

const dataDirectory = path.join(__dirname, "data");
const dataFile = path.join(dataDirectory, "notes.json");

app.use(express.json());

async function initializeDatabase() {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]");
  }
}

async function readNotes() {
  const content = await fs.readFile(dataFile, "utf-8");
  return JSON.parse(content);
}

async function saveNotes(notes) {
  await fs.writeFile(
    dataFile,
    JSON.stringify(notes, null, 2)
  );
}

app.get("/notes", async (req, res, next) => {
  try {
    const notes = await readNotes();
    const { search, tag } = req.query;

    let filteredNotes = notes;

    if (search) {
      const searchText = search.toLowerCase();

      filteredNotes = filteredNotes.filter((note) => {
        return (
          note.title.toLowerCase().includes(searchText) ||
          note.content.toLowerCase().includes(searchText)
        );
      });
    }

    if (tag) {
      filteredNotes = filteredNotes.filter((note) => {
        return note.tags.includes(tag.toLowerCase());
      });
    }

    res.json(filteredNotes);
  } catch (error) {
    next(error);
  }
});

app.post("/notes", async (req, res, next) => {
  try {
    const {
      title,
      content,
      tags = []
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: "title and content are required"
      });
    }

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        error: "tags must be an array"
      });
    }

    const notes = await readNotes();

    const note = {
      id: crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      tags: tags.map((tag) => String(tag).toLowerCase().trim()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.push(note);
    await saveNotes(notes);

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

app.put("/notes/:id", async (req, res, next) => {
  try {
    const notes = await readNotes();
    const noteIndex = notes.findIndex(
      (note) => note.id === req.params.id
    );

    if (noteIndex === -1) {
      return res.status(404).json({
        error: "Note not found"
      });
    }

    const oldNote = notes[noteIndex];

    notes[noteIndex] = {
      ...oldNote,
      title: req.body.title ?? oldNote.title,
      content: req.body.content ?? oldNote.content,
      tags: req.body.tags ?? oldNote.tags,
      updatedAt: new Date().toISOString()
    };

    await saveNotes(notes);

    res.json(notes[noteIndex]);
  } catch (error) {
    next(error);
  }
});

app.delete("/notes/:id", async (req, res, next) => {
  try {
    const notes = await readNotes();
    const remainingNotes = notes.filter(
      (note) => note.id !== req.params.id
    );

    if (remainingNotes.length === notes.length) {
      return res.status(404).json({
        error: "Note not found"
      });
    }

    await saveNotes(remainingNotes);

    res.json({
      message: "Note deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: "Internal server error"
  });
});

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Notes API running at http://localhost:${PORT}`);
  });
});
