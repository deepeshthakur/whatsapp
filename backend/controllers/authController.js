// sent otp

const otpGenerator = require("../utils/otpGenerator");
const response = require("../utils/responseHandler");
const twilioService = require("../services/twilloService");
const generateToken = require("../utils/generateToken");
const User = require("../models/User")
const sendOtpToEmail = require("../services/emailService");
const Conversation = require("../models/Conversatation");
const {uploadFileToCloudinary} = require("../config/cloudinaryConfig");
const sendPhoneAndEmailOtp = async (req, res) => {
  try {
    const { phoneNumber, phoneSuffix, email } = req.body;
    const otp = otpGenerator();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    let user;
    try {
      if (email) {
        user = await User.findOne({ email: email });
        if (!user) {
          user = new User({ email });
        }
        user.emailOtp = otp;
        user.emailOtpExpires = expiry;
        await user.save();
        await sendOtpToEmail(email, otp);

        return response(res, 200, "OTP sent to email", { email });
      }
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number and suffix are required");
      }

      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber : fullPhoneNumber });
      if (!user) {
        user = await new User({ phoneNumber : fullPhoneNumber, phoneSuffix });
      }

      await twilioService.sendOtp(fullPhoneNumber);
      await user.save();
      return response(res, 200, "OTP sent to phone number", user);
    } catch (err) {
      console.error("internal error in sendOtp:", err);
      return response(res, 500, "internal server error");
    }
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return response(res, 500, "Internal server error");
  }
};

// verify otp

const verifyPhoneOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, otp, email } = req.body;

  try {
    let user;

    if (email) {
      user = await User.findOne({ email });
      if (!user) return response(res, 404, "User not found with this email");

      const now = new Date();
      if (!user.emailOtp || String(user.emailOtp) !== String(otp) || user.emailOtpExpires < now) {
        return response(res, 400, "Invalid or expired OTP");
      }

      user.isverified = true;
      user.emailOtp = null;
      user.emailOtpExpires = null;
      await user.save();

    } else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number and suffix are required");
      }

      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber: fullPhoneNumber });
      if (!user) return response(res, 404, "User not found with this phone number");

      const result = await twilioService.verifyOtp(fullPhoneNumber, otp);
      if (result.status !== "approved") return response(res, 400, "Invalid OTP");

      user.isverified = true;
      await user.save();
    }

    // Generate token after successful verification
    const token = generateToken(user._id);
    res.cookie("auth_token", Token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 35 * 24 * 60 * 60 * 1000
    });

    return response(res, 200, "OTP verified successfully", { user, Token });

  } catch (err) {
    console.error(err);
    return response(res, 500, "Something went wrong");
  }
};


const updateProfile = async (req, res) => {
  const { username, agreed, about } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user) return response(res, 404, "User not found");

    const file = req.file;

    // ✅ Handle profile picture (uploaded or from avatar)
    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      user.profilePicture = uploadResult?.secure_url;
    } else if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }

    // ✅ Update basic info
    if (username) user.username = username;
    if (about) user.about = about;

    // ✅ Fix: safely parse agreed to boolean
    if (agreed !== undefined) {
      user.agreed = agreed === "true";
    }

    await user.save();

    return response(res, 200, "Profile updated successfully", user);
  } catch (err) {
    console.error(err);
    return response(res, 500, "Something went wrong");
  }
};



const logout = (req, res) => {
  try{
    res.cookie("token", "", {expires : new Date(0)});
    return response(res,200,"Logged out successfully");

  }catch(err){
    console.error(err);
    return response(res,500,"Something went wrong")
  }
}

const checkAuthenticated = async (req,res)=>{
  try{
    const userId = req.user.userId;
    if(!userId) return response(res,404,"User not authenticated please login again");
    const user = await User.findById(userId);
    if(!user) return response(res,404,"User not found");
    return response(res,200,"User authenticated",user);
  }catch (err){
    console.error(err);
    return response(res,500,"Something went wrong")
  }
}


const getAllUserss = async (req,res)=>{
  const loggedInUser = req.user.userId;
  try{
    const users = await User.find({_id: {$ne: loggedInUser}}).select("username profilePicture lastseen isOnline about phoneNumber phoneSuffix").lean();
    const userWithConversation = await Promise.all(users.map(async(user)=>{
      const conversation = await Conversation.findOne({
        participants: {$all: [loggedInUser, user?._id]}
      }).populate({
        path:"lastmessage",
        select: "content sender reciever createdAt"
      }).lean();
      return {...user, conversation : conversation || null};
      
    }));
    console.log(userWithConversation)
    return response(res,200,"All users fetched successfully",userWithConversation);
  }catch(err){
    console.error(err);
    return response(res,500,"Something went wrong")
  }
    
}
module.exports = { sendPhoneAndEmailOtp, verifyPhoneOtp,updateProfile,logout,checkAuthenticated,getAllUserss };
