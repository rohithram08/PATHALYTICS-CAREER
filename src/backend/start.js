// src/backend/start.js
import app from "./server.js";

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
server.on("error", (err) => {
  console.error("❌ Failed to bind port:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});