import express from "express";
import {
    getShowcasedCategories,
    getShowcaseBySlug,
    createShowcase,
    updateShowcase,
    deleteShowcase,
    getShowcasesAdmin,
} from "../controllers/showcase.js";
import { protect, authorize } from "../middlewares/auth.js";
import upload from "../configs/uploads.js";

const router = express.Router();

// Public route to get active showcases
router.route("/").get(getShowcasedCategories);

// Admin routes
router.route("/admin").get(protect, authorize("admin"), getShowcasesAdmin);

router
    .route("/")
    .post(protect, authorize("admin"), upload.array("images"), createShowcase);

router
    .route("/:slug")
    .get(getShowcaseBySlug) // This could be public or protected depending on requirements
    .put(protect, authorize("admin"), upload.array("images"), updateShowcase)
    .delete(protect, authorize("admin"), deleteShowcase);

export default router;
