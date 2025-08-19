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
} from "../controllers/user.js";
import upload from "../configs/uploads.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.route("/").get(protect, authorize("admin"), getUsers);

router.route("/me").get(protect, getMe);
router
  .route("/:id")
  .get(protect, authorize("admin"), getUser)
  .put(protect, authorize("admin"), updateUser)
  .delete(protect, authorize("admin"), deleteUser);

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/admin/login").post(adminLogin);
router.route("/signout").get(protect, signout);
router.route("/profile").put(protect, upload.single("avatar"), updateProfile);
router
  .route("/subscribe")
  .post(protect, authorize("admin"), subscribeUserToCourse);

export default router;
