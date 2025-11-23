const dotenv = require('dotenv');
dotenv.config();
const twilio = require('twilio');




const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accountSid, authToken);

// Send OTP via Twilio Verify
const sendOtp = async (phoneNumber) => {
  try {
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    console.log("Sending OTP to:", phoneNumber);
    const response = await client.verify.v2.services(serviceSid)
      .verifications
      .create({ to: phoneNumber, channel: 'sms' });

    console.log("OTP send status:", response.status);
    return response;
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP");
  }
};

// Verify OTP via Twilio Verify
const verifyOtp = async (phoneNumber, otp) => {
  try {
    if (!phoneNumber || !otp) {
      throw new Error("Phone number and OTP are required");
    }

    console.log("Verifying OTP for:", phoneNumber);
    const response = await client.verify.v2.services(serviceSid)
      .verificationChecks
      .create({ to: phoneNumber, code: otp });

    console.log("Verification status:", response.status);
    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw new Error("Failed to verify OTP");
  }
};

module.exports = { sendOtp, verifyOtp };