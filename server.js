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