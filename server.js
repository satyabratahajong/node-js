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