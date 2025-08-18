import process from "node:process";
const sendEmail = async (app, options) => {
  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  const info = await app.mailTransporter.sendMail(message);

  await console.log(info);
};

export default sendEmail;