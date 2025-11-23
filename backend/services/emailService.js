const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
 service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // generated ethereal user
    pass: process.env.EMAIL_PASS, // generated ethereal password
  },
});


transporter.verify((error, success) => {
    if (error) {
        console.error("Error with email transporter:", error);
    } else {
        console.log("Email transporter is ready to send messages");
    }
});

const sendOtpToEmail = async (email, otp) => {
      const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #075e54;">🔐 WhatsApp Web Verification</h2>
      
      <p>Hi there,</p>
      
      <p>Your one-time password (OTP) to verify your WhatsApp Web account is:</p>
      
      <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
        ${otp}
      </h1>

      <p><strong>This OTP is valid for the next 5 minutes.</strong> Please do not share this code with anyone.</p>

      <p>If you didn’t request this OTP, please ignore this email.</p>

      <p style="margin-top: 20px;">Thanks & Regards,<br/>WhatsApp Web Security Team</p>

      <hr style="margin: 30px 0;" />

      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;
  await transporter.sendMail({
    from: `"WhatsApp Web" <${process.env.EMAIL_USER}>`, // sender address
    to: email, // list of receivers
    subject: "Your WhatsApp Web OTP Code", // Subject line
    html: html, // html body
  });
}


module.exports = sendOtpToEmail;