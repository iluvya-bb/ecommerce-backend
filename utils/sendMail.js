import { sendEmail } from "./emailService.js";
import { loadConfig } from "../configs/config.js";

const conf = loadConfig();

/**
 * Get frontend URL from config
 */
const getFrontendUrl = () => {
	return conf.email?.frontendUrl || "http://localhost:5173";
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, resetToken, baseUrl) => {
	const resetUrl = `${baseUrl || getFrontendUrl()}/reset-password?token=${resetToken}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Нууц үг сэргээх</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
	<table role="presentation" style="width: 100%; border-collapse: collapse;">
		<tr>
			<td align="center" style="padding: 40px 0;">
				<table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); border-radius: 16px 16px 0 0;">
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">EduShop</h1>
							<p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Нууц үг сэргээх хүсэлт</p>
						</td>
					</tr>

					<!-- Content -->
					<tr>
						<td style="padding: 40px;">
							<h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">Сайн байна уу, ${user.name}!</h2>
							<p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
								Таны бүртгэлтэй холбоотой нууц үг сэргээх хүсэлт ирсэн байна. Нууц үгээ шинэчлэхийн тулд доорх товчийг дарна уу.
							</p>

							<!-- Button -->
							<table role="presentation" style="width: 100%; border-collapse: collapse;">
								<tr>
									<td align="center" style="padding: 20px 0;">
										<a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
											Нууц үг сэргээх
										</a>
									</td>
								</tr>
							</table>

							<p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
								Хэрэв товч ажиллахгүй бол дараах линкийг хуулж browser-дээ оруулна уу:
							</p>
							<p style="margin: 0 0 20px; padding: 12px; background-color: #f3f4f6; border-radius: 8px; word-break: break-all; color: #7c3aed; font-size: 14px;">
								${resetUrl}
							</p>

							<p style="margin: 20px 0 0; color: #9ca3af; font-size: 14px;">
								Энэ линк 1 цагийн дотор хүчинтэй.
							</p>

							<div style="margin-top: 30px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
								<p style="margin: 0; color: #92400e; font-size: 14px;">
									<strong>Анхааруулга:</strong> Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ и-мэйлийг үл тоомсорлоно уу. Таны бүртгэл аюулгүй хэвээр байна.
								</p>
							</div>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
							<p style="margin: 0; color: #9ca3af; font-size: 12px;">
								© ${new Date().getFullYear()} EduShop. Бүх эрх хуулиар хамгаалагдсан.
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`;

	const text = `
Сайн байна уу, ${user.name}!

Таны бүртгэлтэй холбоотой нууц үг сэргээх хүсэлт ирсэн байна.

Нууц үгээ шинэчлэхийн тулд дараах линк дээр дарна уу:
${resetUrl}

Энэ линк 1 цагийн дотор хүчинтэй.

Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ и-мэйлийг үл тоомсорлоно уу.

© ${new Date().getFullYear()} EduShop
	`;

	return await sendEmail({
		to: user.email,
		subject: "Нууц үг сэргээх - EduShop",
		html,
		text,
	});
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async (order, contact) => {
	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Захиалга баталгаажлаа</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
	<table role="presentation" style="width: 100%; border-collapse: collapse;">
		<tr>
			<td align="center" style="padding: 40px 0;">
				<table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); border-radius: 16px 16px 0 0;">
							<div style="font-size: 48px; margin-bottom: 10px;">📦</div>
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Захиалга баталгаажлаа!</h1>
							<p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Захиалгын дугаар: #${order.id}</p>
						</td>
					</tr>

					<!-- Content -->
					<tr>
						<td style="padding: 40px;">
							<h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">Сайн байна уу, ${contact.name}!</h2>
							<p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
								Таны захиалга амжилттай бүртгэгдлээ. Төлбөр баталгаажсны дараа бид таны захиалгыг бэлдэж эхэлнэ.
							</p>

							<div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
								<h3 style="margin: 0 0 12px; color: #1f2937; font-size: 16px; font-weight: 600;">Захиалгын мэдээлэл:</h3>
								<p style="margin: 8px 0; color: #4b5563;"><strong>Нийт дүн:</strong> ${order.total?.toLocaleString()}₮</p>
								<p style="margin: 8px 0; color: #4b5563;"><strong>Төлөв:</strong> ${order.status}</p>
							</div>

							<p style="margin: 20px 0 0; color: #6b7280; font-size: 14px;">
								Захиалгын явцыг манай вэб сайтаас хянах боломжтой.
							</p>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
							<p style="margin: 0; color: #9ca3af; font-size: 12px;">
								© ${new Date().getFullYear()} EduShop. Бүх эрх хуулиар хамгаалагдсан.
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`;

	const text = `
Сайн байна уу, ${contact.name}!

Таны захиалга амжилттай бүртгэгдлээ.

Захиалгын дугаар: #${order.id}
Нийт дүн: ${order.total?.toLocaleString()}₮
Төлөв: ${order.status}

Төлбөр баталгаажсны дараа бид таны захиалгыг бэлдэж эхэлнэ.

© ${new Date().getFullYear()} EduShop
	`;

	return await sendEmail({
		to: contact.email,
		subject: `Захиалга #${order.id} баталгаажлаа - EduShop`,
		html,
		text,
	});
};

/**
 * Send payment confirmation email
 */
export const sendPaymentConfirmationEmail = async (order, contact) => {
	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Төлбөр баталгаажлаа</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
	<table role="presentation" style="width: 100%; border-collapse: collapse;">
		<tr>
			<td align="center" style="padding: 40px 0;">
				<table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
							<div style="font-size: 48px; margin-bottom: 10px;">✅</div>
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Төлбөр амжилттай!</h1>
							<p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Захиалгын дугаар: #${order.id}</p>
						</td>
					</tr>

					<!-- Content -->
					<tr>
						<td style="padding: 40px;">
							<h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">Сайн байна уу, ${contact.name}!</h2>
							<p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
								Таны төлбөр амжилттай баталгаажлаа. Бид одоо таны захиалгыг бэлдэж эхэлнэ.
							</p>

							<div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
								<h3 style="margin: 0 0 12px; color: #166534; font-size: 16px; font-weight: 600;">Төлбөрийн мэдээлэл:</h3>
								<p style="margin: 8px 0; color: #15803d;"><strong>Нийт дүн:</strong> ${order.total?.toLocaleString()}₮</p>
								<p style="margin: 8px 0; color: #15803d;"><strong>Төлөв:</strong> Төлөгдсөн</p>
							</div>

							<p style="margin: 20px 0 0; color: #6b7280; font-size: 14px;">
								Захиалгын явцыг бид тогтмол мэдэгдэх болно.
							</p>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
							<p style="margin: 0; color: #9ca3af; font-size: 12px;">
								© ${new Date().getFullYear()} EduShop. Бүх эрх хуулиар хамгаалагдсан.
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`;

	const text = `
Сайн байна уу, ${contact.name}!

Таны төлбөр амжилттай баталгаажлаа.

Захиалгын дугаар: #${order.id}
Нийт дүн: ${order.total?.toLocaleString()}₮
Төлөв: Төлөгдсөн

Бид одоо таны захиалгыг бэлдэж эхэлнэ.

© ${new Date().getFullYear()} EduShop
	`;

	return await sendEmail({
		to: contact.email,
		subject: `Төлбөр баталгаажлаа - Захиалга #${order.id} - EduShop`,
		html,
		text,
	});
};

export { sendEmail };
