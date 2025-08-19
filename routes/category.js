import express from "express";
import {
	getCategories,
	getAllCategoriesAdmin,
	getCategory,
	createCategory,
	updateCategory,
	deleteCategory,
	deleteCategoryImage,
} from "../controllers/category.js";
import { protect, authorize } from "../middlewares/auth.js";
import upload from "../configs/uploads.js";

const router = express.Router();

router.route("/admin").get(protect, authorize("admin"), getAllCategoriesAdmin);

router
	.route("/")
	.get(getCategories)
	.post(protect, authorize("admin"), upload.array("images"), createCategory);

router
	.route("/:id/image")
	.delete(protect, authorize("admin"), deleteCategoryImage);

router
	.route("/:id")
	.get(getCategory)
	.put(protect, authorize("admin"), upload.array("images"), updateCategory)
	.delete(protect, authorize("admin"), deleteCategory);

export default router;