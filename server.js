require("dotenv").config();

const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
};

module.exports = env;
const books = [];
const members = [];
const borrowRecords = [];

function getBooks() {
  return books;
}

function getMembers() {
  return members;
}

function getBorrowRecords() {
  return borrowRecords;
}

module.exports = {
  getBooks,
  getMembers,
  getBorrowRecords,
};

const express = require("express");

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "Library Book Borrowing API",
    time: new Date().toISOString(),
  });
});

module.exports = app;

const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  console.log(`Library API running on port ${env.port}`);
});

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;

const env = require("../config/env");

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  const message =
    statusCode === 500 && env.nodeEnv === "production"
      ? "Internal server error"
      : error.message || "Internal server error";

  console.error(`[ERROR] ${statusCode}: ${message}`);

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

const express = require("express");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "Library Book Borrowing API",
    time: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

const express = require("express");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");


app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "Library Book Borrowing API",
    time: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

const { v4: uuid } = require("uuid");
const ApiError = require("../utils/ApiError");
const store = require("../data/store");
const bookService = require("./bookService");
const memberService = require("./memberService");

const MAX_BOOKS_PER_MEMBER = 3;
const LOAN_DAYS = 14;

function borrowBook({ bookId, memberId }) {
  const book = bookService.getBookById(bookId);
  const member = memberService.getMemberById(memberId);

  const records = store.getBorrowRecords();

  const activeLoans = records.filter(
    (record) =>
      record.memberId === memberId &&
      record.status === "BORROWED"
  );

  if (activeLoans.length >= MAX_BOOKS_PER_MEMBER) {
    throw new ApiError(
      400,
      `Member cannot borrow more than ${MAX_BOOKS_PER_MEMBER} books`
    );
  }

  const alreadyBorrowed = activeLoans.some(
    (record) => record.bookId === bookId
  );

  if (alreadyBorrowed) {
    throw new ApiError(400, "Member has already borrowed this book");
  }

  if (book.availableCopies <= 0) {
    throw new ApiError(409, "No copies available for this book");
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

  const record = {
    id: uuid(),
    bookId,
    memberId,
    bookTitle: book.title,
    memberName: member.name,
    borrowedAt: new Date().toISOString(),
    dueDate: dueDate.toISOString(),
    returnedAt: null,
    status: "BORROWED",
  };

  book.availableCopies -= 1;
  records.push(record);

  return record;
}

function returnBook(recordId) {
  const records = store.getBorrowRecords();

  const record = records.find((item) => item.id === recordId);

  if (!record) {
    throw new ApiError(404, `Borrow record not found: ${recordId}`);
  }

  if (record.status === "RETURNED") {
    throw new ApiError(400, "Book has already been returned");
  }

  const book = bookService.getBookById(record.bookId);
  book.availableCopies += 1;

  record.returnedAt = new Date().toISOString();
  record.status = "RETURNED";

  const isLate = new Date(record.returnedAt) > new Date(record.dueDate);

  return {
    ...record,
    late: isLate,
  };
}


