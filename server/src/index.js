import { app } from "./app.js";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import fileRoutes from "./routes/file.routes.js";
import userRoutes from "./routes/user.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import path from "path";
import express from "express";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const PORT = process.env.PORT || 5600;

const startServer = async () => {
  try {
    await connectDB();

    // Register API routes
    app.use("/api/files", fileRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/ai", aiRoutes);

    // Static hosting for the built client (optional in prod)
    app.use(express.static(path.join(__dirname, "/client")));

    // Public short-link redirect resolver.
    // NOTE: the canonical JSON handler lives at GET /api/files/f/:shortCode.
    // This top-level route only redirects a browser hitting /f/:code to the
    // frontend share page. Keeping response shapes separate avoids the
    // duplicate-handler ambiguity that existed before.
    app.get("/f/:shortCode", (req, res) => {
      const { shortCode } = req.params;
      if (!shortCode) return res.status(400).send("Short code is required");
      const clientBase = process.env.CLIENT_URL || "";
      return res.redirect(`${clientBase}/download/${shortCode}`);
    });

    // Global error handler — must be the last middleware registered.
    // Any handler that calls next(err) or throws will end up here instead of
    // dumping a stack trace to the client.
    app.use((err, _req, res, _next) => {
      console.error("Unhandled error:", err);
      // Multer file-size / filter errors carry a `.code` or specific message.
      if (err?.message?.startsWith("❌ Unsupported file type")) {
        return res.status(400).json({ error: err.message });
      }
      if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large" });
      }
      return res.status(500).json({ error: "Internal Server Error" });
    });

    const server = app.listen(PORT, () => {
      console.log(`✅ Server is running at http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        console.error(`To release port ${PORT} on Windows, run:`);
        console.error(`Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
      } else {
        console.error("❌ Server error:", err);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
  }
};

// Start server
startServer();
