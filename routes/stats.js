import express from "express";
import { getDashboardStats } from "../controllers/stats.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.route("/").get(protect, authorize("admin"), getDashboardStats);

export default router;
