import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { loadConfig } from "../configs/config.js";

const conf = loadConfig();

const sesClient = new SESClient({
	region: conf.email?.sesRegion || conf.aws?.region || "ap-northeast-1",
	credentials: {
		accessKeyId: conf.aws?.accessKeyId,
		secretAccessKey: conf.aws?.secretAccessKey,
	},
});

/**
 * Send email using AWS SES
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 */
export const sendEmail = async (options) => {
	const fromEmail =
		conf.email?.fromEmail ||
		conf.aws?.sesFromEmail ||
		"noreply@edushop.mn";

	const params = {
		Source: fromEmail,
		Destination: {
			ToAddresses: [options.to],
		},
		Message: {
			Subject: {
				Data: options.subject,
				Charset: "UTF-8",
			},
			Body: {
				Text: {
					Data: options.text || "",
					Charset: "UTF-8",
				},
				Html: {
					Data: options.html || "",
					Charset: "UTF-8",
				},
			},
		},
	};

	const command = new SendEmailCommand(params);

	try {
		const data = await sesClient.send(command);
		console.log(
			`Email sent successfully to ${options.to}. MessageID: ${data.MessageId}`,
		);
		return data;
	} catch (error) {
		console.error("Error sending email:", error);
		throw error;
	}
};

export default sendEmail;
