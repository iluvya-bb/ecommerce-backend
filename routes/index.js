import express from "express";
import productRoutes from "./product.js";
import categoryRoutes from "./category.js";
import orderRoutes from "./order.js";
import userRoutes from "./user.js";
import parameterRoutes from "./parameter.js";
import uploadRoutes from "./uploads.js";
import editorUploadRoutes from "./editorUploads.js";
import checkoutRoutes from "./checkout.js";
import settingRoutes from "./setting.js";

const router = express.Router();

router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use("/users", userRoutes);
router.use("/parameters", parameterRoutes);
router.use("/uploads", uploadRoutes);
router.use("/editor-uploads", editorUploadRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/settings", settingRoutes);

export default router;
