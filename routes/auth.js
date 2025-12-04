import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { loadConfig } from "../configs/config.js";

const router = express.Router();

// @desc    Initiate Google OAuth login
// @route   GET /auth/google
// @access  Public
router.get(
	"/google",
	passport.authenticate("google", {
		scope: ["profile", "email"],
		session: false,
	})
);

// @desc    Google OAuth callback
// @route   GET /auth/google/callback
// @access  Public
router.get(
	"/google/callback",
	(req, res, next) => {
		const config = loadConfig();
		const frontendUrl = config.frontend?.url || "http://localhost:5174";

		passport.authenticate("google", {
			session: false,
			failureRedirect: `${frontendUrl}/login?error=oauth_failed`,
		})(req, res, next);
	},
	async (req, res) => {
		const config = loadConfig();
		const frontendUrl = config.frontend?.url || "http://localhost:5174";

		try {
			const user = req.user;
			const { Session } = req.db.ecommerce.models;

			// Generate device info
			const deviceId = uuidv4();
			const deviceType = req.headers["user-agent"] || "web";

			// Create JWT token
			const token = jwt.sign(
				{ id: user.id, deviceId, deviceType },
				process.env.JWT_SECRET,
				{ expiresIn: process.env.JWT_EXPIRE || "7d" }
			);

			// Invalidate all previous sessions for this user
			await Session.destroy({ where: { userId: user.id } });

			// Create new session
			await Session.create({
				userId: user.id,
				deviceId,
				deviceType,
				sessionToken: token,
			});

			// Redirect to frontend with token
			res.redirect(`${frontendUrl}/oauth/callback?token=${token}`);
		} catch (error) {
			console.error("OAuth callback error:", error);
			res.redirect(`${frontendUrl}/login?error=oauth_failed`);
		}
	}
);

export default router;
