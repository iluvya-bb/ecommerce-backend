import express from "express";
import {
	getOrders,
	getOrder,
	createOrder,
	getAllOrdersAdmin,
	updateOrderStatusAdmin,
	getOrderAdmin,
	getOrdersByContact,
	lookupOrders,
	trackOrder,
} from "../controllers/order.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

// Public routes for guest checkout
router.route("/").post(createOrder);
router.route("/lookup").post(lookupOrders);
router.route("/track/:id").get(trackOrder);
router.route("/contact/:phone").get(getOrdersByContact);

// User-specific routes (protected)
router.route("/my-orders").get(protect, getOrders);
router.route("/:id").get(protect, getOrder);

// Admin routes (protected and authorized)
router
	.route("/admin/all")
	.get(protect, authorize("admin"), getAllOrdersAdmin);
router
	.route("/admin/:id")
	.get(protect, authorize("admin"), getOrderAdmin);
router
	.route("/:id/status")
	.put(protect, authorize("admin"), updateOrderStatusAdmin);

export default router;