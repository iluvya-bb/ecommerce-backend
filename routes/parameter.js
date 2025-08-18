import express from "express";
import { getParameters, getParameter, createParameter, updateParameter, deleteParameter } from "../controllers/parameter.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.route("/").get(getParameters).post(protect, authorize("admin"), createParameter);

router.route("/:id").get(getParameter).put(protect, authorize("admin"), updateParameter).delete(protect, authorize("admin"), deleteParameter);

export default router;