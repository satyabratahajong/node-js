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
const ApiError = require("../utils/ApiError");

const devices = new Map();
const readings = new Map();

function createDevice({ deviceId, name, location }) {
  if (devices.has(deviceId)) {
    throw new ApiError(409, `Device already exists: ${deviceId}`);
  }

  const device = {
    deviceId,
    name,
    location: location || "Unknown",
    createdAt: new Date().toISOString(),
  };

  devices.set(deviceId, device);
  readings.set(deviceId, []);

  return device;
}

function getAllDevices() {
  return Array.from(devices.values());
}

function getDeviceById(deviceId) {
  const device = devices.get(deviceId);

  if (!device) {
    throw new ApiError(404, `Device not found: ${deviceId}`);
  }

  return device;
}

function addReading(deviceId, { temperature, humidity }) {
  getDeviceById(deviceId);

  const reading = {
    temperature,
    humidity,
    timestamp: new Date().toISOString(),
  };

  const deviceReadings = readings.get(deviceId);
  deviceReadings.push(reading);

  if (deviceReadings.length > 100) {
    deviceReadings.shift();
  }

  return reading;
}

function getReadings(deviceId) {
  getDeviceById(deviceId);

  return readings.get(deviceId);
}

function getLatestReading(deviceId) {
  const deviceReadings = getReadings(deviceId);

  if (!deviceReadings.length) {
    throw new ApiError(404, `No readings found for device: ${deviceId}`);
  }

  return deviceReadings[deviceReadings.length - 1];
}

module.exports = {
  createDevice,
  getAllDevices,
  getDeviceById,
  addReading,
  getReadings,
  getLatestReading,
};

function validateDeviceRegistration(req, res, next) {
  const { deviceId, name } = req.body;

  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({
      success: false,
      error: "deviceId is required and must be a string",
    });
  }

  if (!name || typeof name !== "string") {
    return res.status(400).json({
      success: false,
      error: "name is required and must be a string",
    });
  }

  next();
}

function validateReading(req, res, next) {
  const { temperature, humidity } = req.body;

  if (typeof temperature !== "number" || Number.isNaN(temperature)) {
    return res.status(400).json({
      success: false,
      error: "temperature is required and must be a number",
    });
  }

  if (typeof humidity !== "number" || Number.isNaN(humidity)) {
    return res.status(400).json({
      success: false,
      error: "humidity is required and must be a number",
    });
  }

  next();
}

module.exports = {
  validateDeviceRegistration,
  validateReading,
};