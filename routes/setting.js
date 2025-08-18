import express from "express";
import { getSettings, updateSettings } from "../controllers/setting.js";
import { protect, authorize } from "../middlewares/auth.js";
import upload from "../configs/uploads.js";

const router = express.Router();

router.route("/").get(getSettings).put(protect, authorize("admin"), upload.single("logo"), updateSettings);

export default router;
