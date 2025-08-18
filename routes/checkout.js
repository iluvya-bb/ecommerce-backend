import express from "express";
import { checkout } from "../controllers/checkout.js";
import { tokenParsing } from "../middlewares/auth.js";

const router = express.Router();

// This route is public, but tokenParsing will attach a user if a token is present
router.route("/").post(tokenParsing, checkout);

export default router;
