const cors = require("cors");
const express = require("express");
const path = require("path");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const authRoutes = require("./routes/authRoutes");
const healthRoutes = require("./routes/healthRoutes");
const storeRoutes = require("./routes/storeRoutes");
const userRoutes = require("./routes/userRoutes");
const srsRoutes = require("./routes/srsRoutes");
const createRateLimiter = require("./middleware/rateLimiter");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
const corsOptions = corsOrigin === "*"
  ? {}
  : { origin: corsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean) };

app.use(cors(corsOptions));
app.use(express.json({ limit: "15mb" }));
app.use("/api", createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || (process.env.NODE_ENV === "production" ? 300 : 5000)),
}));

// Safety net for older frontend builds or misconfigured env values that send /api/api/...
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/api/")) {
    req.url = req.url.replace("/api/api/", "/api/");
  }
  next();
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", srsRoutes);
app.use("/api/store", storeRoutes);

// Serve the built React frontend when running only the backend server.
const clientDistPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDistPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDistPath, "index.html"), (error) => {
    if (error) next();
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
