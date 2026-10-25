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