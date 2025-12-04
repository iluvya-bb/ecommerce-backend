import express from "express";
import {
	subscribeUserToCourse,
	register,
	login,
	adminLogin,
	signout,
	updateProfile,
	getUsers,
	getUser,
	updateUser,
	deleteUser,
	getMe,
	forgotPassword,
	resetPassword,
} from "../controllers/user.js";
import upload from "../configs/uploads.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

// Public routes
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/admin/login").post(adminLogin);

// Password reset routes (public)
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);

// Protected routes
router.route("/me").get(protect, getMe);
router.route("/signout").get(protect, signout);
router.route("/profile").put(protect, upload.single("avatar"), updateProfile);

// Admin routes
router.route("/").get(protect, authorize("admin"), getUsers);
router
	.route("/:id")
	.get(protect, authorize("admin"), getUser)
	.put(protect, authorize("admin"), updateUser)
	.delete(protect, authorize("admin"), deleteUser);

router
	.route("/subscribe")
	.post(protect, authorize("admin"), subscribeUserToCourse);

export default router;
