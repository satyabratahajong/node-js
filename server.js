const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const PORT = 3002;

const db = new Database("expenses.db");

app.use(express.json());

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    expense_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

app.get("/", (req, res) => {
  res.json({
    message: "Expense Tracker API",
    endpoints: [
      "GET /expenses",
      "POST /expenses",
      "DELETE /expenses/:id",
      "GET /expenses/summary"
    ]
  });
});

app.get("/expenses", (req, res) => {
  const { category } = req.query;

  let expenses;

  if (category) {
    expenses = db
      .prepare(
        "SELECT * FROM expenses WHERE category = ? ORDER BY expense_date DESC"
      )
      .all(category);
  } else {
    expenses = db
      .prepare("SELECT * FROM expenses ORDER BY expense_date DESC")
      .all();
  }

  res.json(expenses);
});

app.post("/expenses", (req, res) => {
  const {
    title,
    amount,
    category,
    expenseDate
  } = req.body;

  if (!title || !category || !expenseDate) {
    return res.status(400).json({
      error: "title, category and expenseDate are required"
    });
  }

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({
      error: "amount must be a positive number"
    });
  }

  const statement = db.prepare(`
    INSERT INTO expenses
    (title, amount, category, expense_date)
    VALUES (?, ?, ?, ?)
  `);

  const result = statement.run(
    title,
    amount,
    category,
    expenseDate
  );

  const expense = db
    .prepare("SELECT * FROM expenses WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(expense);
});

app.delete("/expenses/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM expenses WHERE id = ?")
    .run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({
      error: "Expense not found"
    });
  }

  res.json({
    message: "Expense deleted successfully"
  });
});

app.get("/expenses/summary", (req, res) => {
  const total = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses")
    .get();

  const byCategory = db
    .prepare(`
      SELECT
        category,
        SUM(amount) AS total,
        COUNT(*) AS count
      FROM expenses
      GROUP BY category
      ORDER BY total DESC
    `)
    .all();

  const monthly = db
    .prepare(`
      SELECT
        substr(expense_date, 1, 7) AS month,
        SUM(amount) AS total
      FROM expenses
      GROUP BY month
      ORDER BY month DESC
    `)
    .all();

  res.json({
    total: Number(total.total.toFixed(2)),
    byCategory,
    monthly
  });
});

app.listen(PORT, () => {
  console.log(`Expense API running at http://localhost:${PORT}`);
});