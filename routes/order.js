import express from "express";
import {
	getOrders,
	getOrder,
	createOrder,
	getAllOrdersAdmin,
	updateOrderStatusAdmin,
	getOrderAdmin,
	getOrdersByContact,
} from "../controllers/order.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

// Public route for creating an order (guest checkout)
router.route("/").post(createOrder);

// User-specific routes (protected)
router.route("/my-orders").get(protect, getOrders);
router.route("/contact/:phone").get(getOrdersByContact);
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