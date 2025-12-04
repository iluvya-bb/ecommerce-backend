import express from "express";
import {
	getPromoCodes,
	getPromoCode,
	createPromoCode,
	updatePromoCode,
	deletePromoCode,
	validatePromoCode,
	togglePromoCode,
} from "../controllers/promocode.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

// Public routes
router.post("/validate", validatePromoCode);

// Admin routes
router.use(protect, authorize("admin"));
router.route("/").get(getPromoCodes).post(createPromoCode);
router.route("/:id").get(getPromoCode).put(updatePromoCode).delete(deletePromoCode);
router.put("/:id/toggle", togglePromoCode);

export default router;
