import express from "express";
import path from "path";

const router = express.Router();

// Serve static files from the "uploads" directory
router.use("/", express.static(path.join(process.cwd(), "uploads")));

export default router;
