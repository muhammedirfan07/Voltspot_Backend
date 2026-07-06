const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 2525,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
});
console.log("BREVO USER:", process.env.BREVO_SMTP_USER);
console.log("BREVO KEY:", process.env.BREVO_SMTP_KEY);
console.log("---Email access working----");

transporter.verify((error, success) => {
    if (error) {
      console.log(error);
    } else {
      console.log("ready to message😍😍😍");
    }
});

module.exports = transporter;