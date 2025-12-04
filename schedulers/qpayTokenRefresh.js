import cron from "node-cron";
import qpayService from "../services/qpayService.js";
import { loadConfig } from "../configs/config.js";

let refreshJob = null;

/**
 * Initialize QPay token refresh scheduler
 * This ensures the QPay token is refreshed periodically
 */
export function initQPayTokenRefresh() {
	try {
		const config = loadConfig();
		const qpayConfig = config.qpay || {};

		// Get refresh interval from config (default to 5 minutes)
		let refreshInterval = qpayConfig.tokenRefreshInterval || 5;

		// Validate interval is positive
		if (refreshInterval <= 0) {
			console.warn(
				"QPay token refresh interval must be positive. Using default of 5 minutes.",
			);
			refreshInterval = 5;
		}

		// Convert minutes to cron expression
		// Format: "*/N * * * *" where N is the interval in minutes
		const cronExpression = `*/${refreshInterval} * * * *`;

		console.log(
			`Initializing QPay token refresh scheduler (every ${refreshInterval} minutes)...`,
		);

		// Schedule the token refresh job
		refreshJob = cron.schedule(
			cronExpression,
			async () => {
				try {
					console.log("Running QPay token refresh job...");
					await qpayService.getAccessToken();
					console.log("QPay token refreshed successfully");
				} catch (error) {
					console.error("Failed to refresh QPay token:", error.message);
				}
			},
			{
				scheduled: true,
				timezone: "Asia/Ulaanbaatar",
			},
		);

		// Immediately refresh token on startup
		qpayService
			.getAccessToken()
			.then(() => {
				console.log("Initial QPay token obtained successfully");
			})
			.catch((error) => {
				console.warn(
					"Failed to obtain initial QPay token:",
					error.message,
				);
			});

		console.log(
			`QPay token refresh scheduler initialized (every ${refreshInterval} minutes)`,
		);
	} catch (error) {
		console.error("Failed to initialize QPay token refresh:", error.message);
	}
}

/**
 * Stop the QPay token refresh scheduler
 */
export function stopQPayTokenRefresh() {
	if (refreshJob) {
		refreshJob.stop();
		console.log("QPay token refresh scheduler stopped");
	}
}

/**
 * Get the current refresh job status
 */
export function getRefreshJobStatus() {
	return {
		isRunning: refreshJob ? true : false,
		nextRun: refreshJob ? "Check cron schedule" : null,
	};
}
