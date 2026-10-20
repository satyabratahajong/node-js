require("dotenv").config();
const path = require("path");

const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  dbFile: path.join(process.cwd(), "data", "db.json"),
};

module.exports = env;