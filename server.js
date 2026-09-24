require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from the .env file");
}

const db = new Database("users.db");

app.use(express.json());

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "2h"
    }
  );
}

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Access token is required"
    });
  }

  const token = authorization.substring("Bearer ".length);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

app.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "name, email and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must contain at least 6 characters"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({
        error: "Email is already registered"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db
      .prepare(`
        INSERT INTO users (name, email, password_hash)
        VALUES (?, ?, ?)
      `)
      .run(name.trim(), normalizedEmail, passwordHash);

    const user = {
      id: result.lastInsertRowid,
      name: name.trim(),
      email: normalizedEmail
    };

    res.status(201).json({
      message: "Registration successful",
      user,
      token: createToken(user)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    res.json({
      message: "Login successful",
      user: publicUser,
      token: createToken(publicUser)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/profile", authenticateToken, (req, res) => {
  const user = db
    .prepare(`
      SELECT id, name, email, created_at
      FROM users
      WHERE id = ?
    `)
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  res.json(user);
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Auth API running at http://localhost:${PORT}`);
});