require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db/pool");
const propertiesRouter = require("./routes/properties");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "127.0.0.1";

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`
    );
  });

  next();
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.use("/api/properties", propertiesRouter);

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

module.exports = app;
