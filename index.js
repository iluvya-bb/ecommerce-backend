import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import process from "node:process";

import { greeting } from "./utils/greeting.js";
import { loadConfig } from "./configs/config.js";
import { DB } from "./db/index.js";
import { dbMiddleware, pickTenant } from "./middlewares/tenantHandler.js";
import { tokenParsing } from "./middlewares/auth.js";
import { extendToken } from "./middlewares/session.js";
import route from "./routes/index.js";
import errorHandler from "./middlewares/error.js";

// main function
(async () => {
	const conf = loadConfig();
	dotenv.config();
	const app = express();
	app.use(cookieParser());

	const db = await DB();

	const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];
	app.use(cors({
		origin: function (origin, callback) {
			if (!origin || allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		credentials: true
	}));
	app.use(dbMiddleware(db));
	// init tenant picker
	app.use(pickTenant);
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use(tokenParsing);
	app.use(extendToken);
	// parse application/json
	app.use(route);
	// parse error messages
	app.use(errorHandler);

	const server = http.createServer(app);

	server.listen(conf.app.port, async () => {
		greeting(conf.app.name, conf.app.port);
	});

	process.on("SIGINT", () => {
		console.log("Shutting down server...");
		server.close(() => {
			console.log("Server closed.");
			process.exit(0);
		});
	});
})();
