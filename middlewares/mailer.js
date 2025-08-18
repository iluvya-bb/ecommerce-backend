import nodemailer from "nodemailer";
var transport = nodemailer.createTransport({
  host: "live.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: "api",
    pass: "8cd540c404bf6c94c6177e33b87a02c1",
  },
});

export default transport;