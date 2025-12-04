import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import process from "node:process";

// Load environment variables FIRST, before any other imports that use them
dotenv.config();

import { greeting } from "./utils/greeting.js";
import { loadConfig } from "./configs/config.js";
import { DB } from "./db/index.js";
import { dbMiddleware, pickTenant } from "./middlewares/tenantHandler.js";
import { authenticateUser } from "./middlewares/session.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import route from "./routes/index.js";
import errorHandler from "./middlewares/error.js";
import { initQPayTokenRefresh, stopQPayTokenRefresh } from "./schedulers/qpayTokenRefresh.js";
import passport from "passport";
import { configurePassport } from "./configs/passport.js";

// main function
(async () => {
	const conf = loadConfig();

	const app = express();
	app.use(cookieParser());

	const db = await DB();

	const allowedOrigins = conf.cors?.origins || [];
	app.use(
		cors({
			origin: function (origin, callback) {
				if (!origin || allowedOrigins.indexOf(origin) !== -1) {
					callback(null, true);
				} else {
					callback(new Error("Not allowed by CORS"));
				}
			},
			credentials: true,
		}),
	);
	app.use(dbMiddleware(db));
	// init tenant picker
	app.use(pickTenant);
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// Initialize Passport for OAuth
	configurePassport(db);
	app.use(passport.initialize());

	app.use(authenticateUser); // Authenticate without extending tokens
	app.use(requestLogger); // Log all requests
	app.use(route);
	app.use(errorHandler);

	const server = http.createServer(app);

	server.listen(conf.app.port, async () => {
		greeting(conf.app.name, conf.app.port);

		// Initialize QPay token refresh scheduler
		initQPayTokenRefresh();
	});

	process.on("SIGINT", () => {
		console.log("Shutting down server...");
		stopQPayTokenRefresh();
		server.close(() => {
			console.log("Server closed.");
			process.exit(0);
		});
	});
})();
