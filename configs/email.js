// Email configuration is now handled via AWS SES in utils/emailService.js
// Configuration is loaded from config.yaml under the 'aws' and 'email' sections
//
// Required config.yaml settings:
//
// aws:
//   region: "ap-southeast-1"
//   accessKeyId: "YOUR_AWS_ACCESS_KEY_ID"
//   secretAccessKey: "YOUR_AWS_SECRET_ACCESS_KEY"
//   sesFromEmail: "noreply@edushop.mn"
//
// email:
//   fromName: "EduShop"
//   fromEmail: "noreply@edushop.mn"
//   frontendUrl: "http://localhost:5173"

export default {};
