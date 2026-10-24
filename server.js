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