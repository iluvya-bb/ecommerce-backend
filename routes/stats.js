import express from "express";
import {
	getDashboardStats,
	getSalesAnalytics,
	getTransactions,
	getRevenueByPaymentMethod,
	exportSalesData,
} from "../controllers/stats.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

// All stats routes require admin access
router.use(protect, authorize("admin"));

// Dashboard overview
router.route("/").get(getDashboardStats);

// Sales analytics with charts data
router.route("/sales").get(getSalesAnalytics);

// Transaction history
router.route("/transactions").get(getTransactions);

// Revenue by payment method
router.route("/revenue-by-payment").get(getRevenueByPaymentMethod);

// Export sales data (CSV/JSON)
router.route("/export").get(exportSalesData);

export default router;
