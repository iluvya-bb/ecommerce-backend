import express from "express";
import {
	getProducts,
	getProduct,
	createProduct,
	updateProduct,
	deleteProduct,
	setFeaturedImage,
	deleteProductImage,
} from "../controllers/product.js";
import { protect, authorize } from "../middlewares/auth.js";
import upload from "../configs/uploads.js";

const router = express.Router();

router
	.route("/")
	.get(getProducts)
	.post(protect, authorize("admin"), upload.array("images"), createProduct);

router
	.route("/:id")
	.get(getProduct)
	.put(protect, authorize("admin"), upload.array("images"), updateProduct)
	.delete(protect, authorize("admin"), deleteProduct);

router
	.route("/:id/featured-image")
	.put(protect, authorize("admin"), setFeaturedImage);

router
	.route("/:id/images/:imageId")
	.delete(protect, authorize("admin"), deleteProductImage);

export default router;
