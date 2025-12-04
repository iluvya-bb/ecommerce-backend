import express from "express";
import multer from "multer";
import path from "path";
import {
	getSales,
	getSale,
	createSale,
	updateSale,
	deleteSale,
	toggleSale,
	getActiveSales,
	getProductSalePrice,
	getProductsWithSalePrices,
} from "../controllers/sale.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

// Configure multer for banner image uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/sales");
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, "sale-" + uniqueSuffix + path.extname(file.originalname));
	},
});

const upload = multer({
	storage,
	fileFilter: (req, file, cb) => {
		const allowedTypes = /jpeg|jpg|png|webp/;
		const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
		const mimetype = allowedTypes.test(file.mimetype);
		if (extname && mimetype) {
			return cb(null, true);
		}
		cb(new Error("Зөвхөн зураг файл оруулна уу"));
	},
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Public routes
router.get("/active", getActiveSales);
router.get("/products-with-prices", getProductsWithSalePrices);
router.get("/product/:productId/price", getProductSalePrice);

// Admin routes
router.use(protect, authorize("admin"));
router.route("/").get(getSales).post(upload.single("bannerImage"), createSale);
router.route("/:id").get(getSale).put(upload.single("bannerImage"), updateSale).delete(deleteSale);
router.put("/:id/toggle", toggleSale);

export default router;
