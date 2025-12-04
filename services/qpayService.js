import axios from "axios";
import crypto from "crypto";
import { loadConfig } from "../configs/config.js";

class QPayService {
	constructor() {
		// Load configuration from config.yaml, with env var fallback
		let config = {};
		try {
			const appConfig = loadConfig();
			config = appConfig.qpay || {};
		} catch (error) {
			console.warn(
				"Failed to load config.yaml, using environment variables:",
				error.message,
			);
		}

		// Configuration with fallback to environment variables
		this.baseURL =
			config.baseURL ||
			process.env.QPAY_BASE_URL ||
			"https://merchant-sandbox.qpay.mn";
		this.clientId =
			config.clientId ||
			process.env.QPAY_CLIENT_ID ||
			process.env.QPAY_USERNAME;
		this.clientSecret =
			config.clientSecret ||
			process.env.QPAY_CLIENT_SECRET ||
			process.env.QPAY_PASSWORD;
		this.invoiceCode = config.invoiceCode || process.env.QPAY_INVOICE_CODE;
		this.webhookSecret =
			config.webhookSecret || process.env.QPAY_WEBHOOK_SECRET;

		if (!this.clientId || !this.clientSecret || !this.invoiceCode) {
			console.warn(
				"QPay credentials not configured. Payment functionality will not work.",
			);
			console.warn(
				"Required: Set qpay section in config.yaml or use environment variables:",
			);
			console.warn("  - QPAY_CLIENT_ID, QPAY_CLIENT_SECRET, QPAY_INVOICE_CODE");
		}

		this.accessToken = null;
		this.refreshToken = null;
		this.tokenExpiresAt = null;
	}

	/**
	 * Get OAuth2 access token from QPay v2 API
	 * Automatically refreshes token if expired
	 * @returns {Promise<string>} Access token
	 */
	async getAccessToken() {
		// Return cached token if still valid (with 5 minute buffer)
		if (
			this.accessToken &&
			this.tokenExpiresAt &&
			Date.now() < this.tokenExpiresAt - 300000
		) {
			return this.accessToken;
		}

		// Try to refresh token first if we have a refresh token
		if (this.refreshToken) {
			try {
				return await this.refreshAccessToken();
			} catch (error) {
				console.warn("Token refresh failed, getting new token:", error.message);
				// Fall through to get new token
			}
		}

		// Get new token
		try {
			const response = await axios.post(
				`${this.baseURL}/v2/auth/token`,
				{},
				{
					auth: {
						username: this.clientId,
						password: this.clientSecret,
					},
				},
			);

			this.accessToken = response.data.access_token;
			this.refreshToken = response.data.refresh_token;

			// QPay tokens typically expire after 1 hour
			const expiresIn = response.data.expires_in || 3600;
			this.tokenExpiresAt = Date.now() + expiresIn * 1000;

			return this.accessToken;
		} catch (error) {
			console.error(
				"Failed to get QPay access token:",
				error.response?.data || error.message,
			);
			throw new Error("Failed to authenticate with QPay");
		}
	}

	/**
	 * Refresh access token using refresh token (v2 API)
	 * @returns {Promise<string>} New access token
	 */
	async refreshAccessToken() {
		if (!this.refreshToken) {
			throw new Error("No refresh token available");
		}

		try {
			const response = await axios.post(`${this.baseURL}/v2/auth/refresh`, {
				refresh_token: this.refreshToken,
			});

			this.accessToken = response.data.access_token;
			this.refreshToken = response.data.refresh_token;

			const expiresIn = response.data.expires_in || 3600;
			this.tokenExpiresAt = Date.now() + expiresIn * 1000;

			return this.accessToken;
		} catch (error) {
			console.error(
				"Failed to refresh QPay token:",
				error.response?.data || error.message,
			);
			throw new Error("Failed to refresh token");
		}
	}

	/**
	 * Create a payment invoice
	 * @param {Object} invoiceData
	 * @param {string} invoiceData.sender_invoice_no - Unique invoice number from your system
	 * @param {number} invoiceData.invoice_amount - Amount in MNT
	 * @param {string} invoiceData.invoice_description - Description of the payment
	 * @param {string} invoiceData.callback_url - URL for payment callback
	 * @returns {Promise<Object>} Invoice details with QR code and payment URLs
	 */
	async createInvoice(invoiceData) {
		try {
			const token = await this.getAccessToken();

			const payload = {
				invoice_code: this.invoiceCode,
				sender_invoice_no: invoiceData.sender_invoice_no,
				invoice_receiver_code: invoiceData.invoice_receiver_code || "terminal",
				invoice_description: invoiceData.invoice_description,
				amount: invoiceData.invoice_amount,
				callback_url: invoiceData.callback_url,
			};

			const response = await axios.post(`${this.baseURL}/v2/invoice`, payload, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			return {
				success: true,
				invoice_id: response.data.invoice_id,
				qr_text: response.data.qr_text,
				qr_image: response.data.qr_image,
				qpay_shorturl: response.data.qpay_shorturl,
				urls: response.data.urls, // Deep links for different banks
			};
		} catch (error) {
			console.error(
				"Failed to create QPay invoice:",
				error.response?.data || error.message,
			);
			throw new Error(
				error.response?.data?.message || "Failed to create payment invoice",
			);
		}
	}

	/**
	 * Check payment status
	 * @param {string} invoiceId - QPay invoice ID
	 * @returns {Promise<Object>} Payment status
	 */
	async checkPayment(invoiceId) {
		try {
			const token = await this.getAccessToken();

			const response = await axios.post(
				`${this.baseURL}/v2/payment/check`,
				{
					object_type: "INVOICE",
					object_id: invoiceId,
					offset: {
						page_number: 1,
						page_limit: 100,
					},
				},
				{
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				},
			);

			return {
				success: true,
				count: response.data.count,
				paid_amount: response.data.paid_amount,
				rows: response.data.rows,
			};
		} catch (error) {
			console.error(
				"Failed to check QPay payment:",
				error.response?.data || error.message,
			);
			throw new Error("Failed to check payment status");
		}
	}

	/**
	 * Cancel an invoice
	 * @param {string} invoiceId - QPay invoice ID
	 * @returns {Promise<Object>} Cancellation result
	 */
	async cancelInvoice(invoiceId) {
		try {
			const token = await this.getAccessToken();

			const response = await axios.delete(
				`${this.baseURL}/v2/invoice/${invoiceId}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			return {
				success: true,
				message: "Invoice cancelled successfully",
			};
		} catch (error) {
			console.error(
				"Failed to cancel QPay invoice:",
				error.response?.data || error.message,
			);
			throw new Error("Failed to cancel invoice");
		}
	}

	/**
	 * Verify webhook signature (if QPay provides signature verification)
	 * @param {Object} payload - Webhook payload
	 * @param {string} signature - Webhook signature
	 * @returns {boolean} Whether signature is valid
	 */
	verifyWebhookSignature(payload, signature) {
		if (!signature) return true; // Some implementations don't use signatures

		try {
			const secret = this.webhookSecret || this.clientSecret;
			const hash = crypto
				.createHmac("sha256", secret)
				.update(JSON.stringify(payload))
				.digest("hex");

			return hash === signature;
		} catch (error) {
			console.error("Failed to verify webhook signature:", error);
			return false;
		}
	}

	/**
	 * Generate a unique invoice number
	 * @param {number} orderId - Order ID
	 * @param {string} type - Transaction type (order, deposit)
	 * @returns {string} Unique invoice number
	 */
	generateInvoiceNo(orderId, type = "order") {
		const timestamp = Date.now();
		const random = Math.floor(Math.random() * 1000)
			.toString()
			.padStart(3, "0");
		return `${type.toUpperCase()}-${orderId}-${timestamp}-${random}`;
	}
}

export default new QPayService();
