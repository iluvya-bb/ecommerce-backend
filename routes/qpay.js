import express from "express";
import {
  createQPayInvoice,
  checkQPayStatus,
  qpayCallback,
  getQPayInfo,
  cancelQPayPayment,
} from "../controllers/qpay.js";

const router = express.Router();

// Public routes (for guest checkout support)
router.post("/create-invoice/:orderId", createQPayInvoice);
router.get("/check/:orderId", checkQPayStatus);
router.get("/order/:orderId", getQPayInfo);
router.delete("/cancel/:orderId", cancelQPayPayment);

// QPay webhook callback (must be public)
router.post("/callback", qpayCallback);

export default router;
