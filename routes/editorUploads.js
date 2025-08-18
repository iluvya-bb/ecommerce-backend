import express from "express";
import { uploadImage } from "../controllers/upload.js";
import { protect, authorize } from "../middlewares/auth.js";
import upload from "../configs/uploads.js";

const router = express.Router();

router
	.route("/")
	.post(protect, authorize("admin"), upload.single("image"), uploadImage);

export default router;
