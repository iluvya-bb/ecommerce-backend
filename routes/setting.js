import express from "express";
import { getSettings, updateSettings } from "../controllers/setting.js";
import { protect, authorize } from "../middlewares/auth.js";
import upload from "../configs/uploads.js";

const router = express.Router();

router.route("/").get(getSettings).put(protect, authorize("admin"), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'heroImage', maxCount: 1 }, { name: 'heroBackgroundImage', maxCount: 1 }]), updateSettings);

export default router;
