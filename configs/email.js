import nodemailer from "nodemailer";
import process from "node:process";
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: "api",
    pass: process.env.SMTP_PASSWORD,
  },
});

export default transport;