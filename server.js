require("dotenv").config();
const path = require("path");

const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  dbFile: path.join(process.cwd(), "data", "db.json"),
};

module.exports = env;
const fs = require("fs");
const path = require("path");

const env = require("../config/env");

function ensureDatabase() {
  const folder = path.dirname(env.dbFile);

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  if (!fs.existsSync(env.dbFile)) {
    fs.writeFileSync(
      env.dbFile,
      JSON.stringify({ categories: [], transactions: [] }, null, 2)
    );
  }
}

function readDatabase() {
  ensureDatabase();

  const raw = fs.readFileSync(env.dbFile, "utf-8");
  return JSON.parse(raw);
}

function writeDatabase(data) {
  ensureDatabase();

  fs.writeFileSync(env.dbFile, JSON.stringify(data, null, 2));
}

module.exports = {
  readDatabase,
  writeDatabase,
};

const express = require("express");

const app = express();

app.use(express.json());

