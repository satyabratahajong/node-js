require("dotenv").config();

const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
};

module.exports = env;
const express = require("express");

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "IoT Device Monitoring API",
    time: new Date().toISOString(),
  });
});

module.exports = app;
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

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && env.nodeEnv === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

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
    status: "ok",
    service: "IoT Device Monitoring API",
    time: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
