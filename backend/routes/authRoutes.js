const express = require('express');
const {sendPhoneAndEmailOtp,verifyPhoneOtp, updateProfile, logout, checkAuthenticated,getAllUserss} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { multerMiddleware } = require('../config/cloudinaryConfig');

const router  = express.Router();

router.post('/send-otp',sendPhoneAndEmailOtp);
router.post('/verify-otp',verifyPhoneOtp);
router.get('/logout',logout)


//protected route
router.put("/update-profile",authMiddleware,multerMiddleware,updateProfile);
router.get("/check-auth",authMiddleware,checkAuthenticated)
router.get("/all-users",authMiddleware,getAllUserss);

module.exports = router;