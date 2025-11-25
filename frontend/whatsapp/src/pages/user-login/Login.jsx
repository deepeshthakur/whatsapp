import React, { use, useState } from "react";
import LoginStore from "../../store/LoginStore";
import countries from "../../utils/Country";

import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { data, useNavigate } from "react-router-dom";
import useUserStore from "../../store/useUserStore";
import { set, useForm } from "react-hook-form";
import useThemeStore from "../../store/ThemeStore";
import { motion, spring } from "framer-motion";
import {
  FaArrowLeft,
  FaChevronDown,
  FaPlus,
  FaUser,
  FaWhatsapp,
} from "react-icons/fa";
import {
  sendOtp,
  updateUserProfile,
  verifyOtp,
} from "../../service/user.service";
import Spinner from "../../utils/Spinner";
import { toast } from "react-toastify";
// validate schema using useform

const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "Please enter a valid phone number")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value
      ),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter a valid email")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value
      ),
  })
  .test(
    "at-lease-one",
    "Either phone number or email is required",
    function (value) {
      return !!(value.phoneNumber || value.email);
    }
  );

const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, "length must be 6")
    .required("Please enter a valid otp"),
});

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("Please enter a valid name"),
  agreed: yup
    .bool()
    .oneOf([true], "You must agree to the terms and conditions"),
});

const Login = () => {
  const { step, setStep, userPhoneData, setUserPhoneData, resetLoginData } =
    LoginStore((state) => state);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showDropDown, setShowDropDown] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [profilePicture, setProilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { theme } = useThemeStore();
  const [loading, setLoading] = useState(false);

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: LoginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch,
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  const ProgressBar = () => (
    <div
      className={`w-full ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
      } rounded-full h-2.5 mb-6`}
    >
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${(step / 3) * 100}%` }}
      ></div>
    </div>
  );

  const filterCountry = countries.filter((country) => {
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm);
  });

  const onLoginSubmit = async () => {
    try {
      setLoading(true);
      if (email) {
        const respones = await sendOtp(null, null, email);
        if (respones.status === "success") {
          toast.info("OTP is send to your email");
          setUserPhoneData({ email });
          setStep(2);
        }
      } else {
        const response = await sendOtp(phoneNumber, selectedCountry.dialCode);
        if (response.status === "success") {
          toast.info("OTP is send to your phone number");
          setUserPhoneData({
            phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          });
          setStep(2);
        }
      }
    } catch (error) {
      console.log(error);
      setError(error.message || "failed to send otp");
    } finally {
      setLoading(false);
    }
  };

  const handleFullOtpAutoFill = (value) => {
    if (!value) return;

    const digits = value.split("").slice(0, otp.length);
    setOtp(digits);
    setOtpValue("otp", digits.join(""));

    const lastIndex = digits.length - 1;
    if (lastIndex >= 0) {
      document.getElementById(`otp-${lastIndex}`).focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index] === "") {
        if (index > 0) {
          document.getElementById(`otp-${index - 1}`).focus();
        }
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }

    if (e.key === "ArrowRight" && index < otp.length - 1) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      if (!userPhoneData) {
        throw new Error("Phone number or email is required");
      }
      const otpString = otp.join("");
      let response;
      if (userPhoneData?.email) {
        response = await verifyOtp(null, null, userPhoneData.email, otpString);
      } else {
        response = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          null,
          otpString
        );
      }

      if (response.status === "success") {
        toast.success("OTP is verified");
        const token = response.data?.token;
        localStorage.setItem("auth_token", token);
        const user = response.data?.user;
        if (user?.username && user?.profilePicture) {
          setUser(user);
          toast.success("Welcome back to WhatsApp");
          navigate("/");
          resetLoginData();
        } else {
          setStep(3);
        }
      }
    } catch (error) {
      console.log(error);
      setError("failed to verify otp");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProilePicture(URL.createObjectURL(file));
    }
  };
  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("agreed", data.agreed ? "true" : "false");
      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("profilePicture", selectedAvatar);
      }

      await updateUserProfile(formData);
      toast.success("Welcome back to WhatsApp");
      navigate("/");
      resetLoginData();
    } catch (error) {
      console.log(error);
      setError(error.message || "failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, value) => {
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));
    if (value && idx < 5) {
      document.getElementById(`otp-${idx + 1}`).focus();
    }
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    setError(null);
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-green-400 to-blue-500"
      } flex items-center justify-center p-4 overflow-hidden relative`}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
        }  p-6 md:p-8  rounded-lg shadow-2xl w-full  max-w-md z-10 relative`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.2,
            type: "spring",
            stifnesss: 260,
            damping: 20,
          }}
          className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center relative"
        >
          <FaWhatsapp className="w-16 h-16 text-white " />
        </motion.div>

        <h1
          className={`text-2xl font-bold text-center mb-6 ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          WhatsApp Login
        </h1>

        <ProgressBar />
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {step === 1 && (
          <form
            action=""
            className="space-y-4"
            onSubmit={handleLoginSubmit(onLoginSubmit)}
          >
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              Enter your phone number to recieve an otp
            </p>
            <div className="relative">
              <div className="flex">
                <div className="relative w-1/3">
                  <button
                    type="button"
                    className={`flex-shrink-0 z-12 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${
                      theme === "dark"
                        ? "text-white bg-gray-700 border-gray-600"
                        : "text-gray-900 bg-gray-100 border-gray-300"
                    } border rounded-s-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100 `}
                    onClick={() => setShowDropDown(!showDropDown)}
                  >
                    <span>
                      {selectedCountry.flag} {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown className="ml-2" />
                  </button>
                  {showDropDown && (
                    <div
                      className={`absolute z-10 w-full mt-1 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 "
                          : "bg-white border-gray-100"
                      } border rounded-md shadow-lg max-h-60 overflow-auto`}
                    >
                      <div
                        className={`sticky top-0 ${
                          theme === "dark"
                            ? "bg-gray-700 border-gray-600"
                            : "bg-white border-gray-100"
                        } p-2`}
                      >
                        <input
                          type="text"
                          placeholder="Search Country"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full px-2 py-1 border ${
                            theme === "dark"
                              ? "bg-gray-600 border-gray-500 text-white"
                              : "bg-white border-gray-300 text-gray-600"
                          } rounded-md focus:outline-none text-sm focus:ring-2 focus:ring-green-500`}
                        />
                      </div>
                      {countries.map((country) => (
                        <button
                          key={country.alpha2}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowDropDown(false);
                          }}
                          className={`w-full text-left px-3 py-2 ${
                            theme === "dark"
                              ? "hover:bg-gray-600"
                              : "hover:bg-gray-100"
                          } focus:outline-none focus:bg-gray-100`}
                        >
                          {country.fl} {country.dialCode} {country.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Phone number input (numeric keypad on mobile) */}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  {...loginRegister("phoneNumber")}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-2/3 px-4 py-2 border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-700"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    LoginErrors.phoneNumber ? "border-red-500" : ""
                  }`}
                />
              </div>
              {LoginErrors.phoneNumber && (
                <p className="text-red-500 text-sm">
                  {LoginErrors.phoneNumber.message}
                </p>
              )}
            </div>

            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gray-300 " />
              <span className="mx-3 text-gray-500 text-sm font-medium">or</span>
              <div className="flex-grow h-px bg-gray-300 " />
            </div>

            <div
              className={`flex items-center border rounded-md px-3 py-2 ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300"
              }`}
            >
              <FaUser
                className={`mr-2 text-gray-400 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                type="email"
                {...loginRegister("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-transparent focus:outline-none ${
                  theme === "dark" ? "text-white" : "text-black"
                }  ${LoginErrors.email ? "border-red-500" : ""}`}
                placeholder="Email (Optional)"
              />
              {LoginErrors.email && (
                <p className="text-red-500 text-sm">
                  {LoginErrors.email.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
            >
              {loading ? <Spinner /> : "Send Otp"}
            </button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              {phoneNumber
                ? `Enter the OTP sent to ${phoneNumber}`
                : `Enter the OTP sent to ${email}`}
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="absolute opacity-0 pointer-events-none h-0 w-0"
              onChange={(e) => handleFullOtpAutoFill(e.target.value)}
            />
            <div className="flex justify-between ">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className={`w-12 h-12 text-center ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 border-2 text-white"
                      : "bg-white border-gray-500 border-2 text-gray-600"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500  ${
                    otpErrors.otp ? "border-red-500" : ""
                  }`}
                />
              ))}
            </div>
            {otpErrors.otp && (
              <p className="text-red-500 text-sm">{otpErrors.otp.message}</p>
            )}
            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
            >
              {loading ? <Spinner /> : "Verify Otp"}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className={`w-full mt-2 ${
                theme === "dark"
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-200 text-gray-700"
              } py-2 rounded-md hover:bg-gray-300 transition flex items-center justify-center`}
            >
              <FaArrowLeft className="mr-2" />
              Wrong number? Go back
            </button>
          </form>
        )}

        {step === 3 && (
          <form
            onSubmit={handleProfileSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-24 h-24 mb-2">
                <img
                  src={profilePicture || selectedAvatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
                <label
                  htmlFor="profile-picture"
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition duration-300"
                >
                  <input
                    type="file"
                    id="profile-picture"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <FaPlus className="w-4 h-4" />
                </label>
              </div>
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                } mb-2`}
              >
                Choose an Avtar
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {avatars.map((avatar, index) => (
                  <img
                    key={index}
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    className={`w-12 h-12 rounded-full cursor-pointer transition duration-300 ease-in-out hover:scale-110 ${
                      selectedAvatar === avatar ? "ring-2 ring-green-500" : ""
                    }`}
                    onClick={() => setSelectedAvatar(avatar)}
                  />
                ))}
              </div>
            </div>
            <div className="relative ">
              <FaUser
                className={`absolute top-1/2 left-3 transform -translate-y-1/2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              />
              <input
                {...profileRegister("username")}
                type="text"
                placeholder="Username"
                className={`w-full pl-10 pr-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 text-white"
                    : "bg-white border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg`}
              />
              {profileErrors.username && (
                <p className="text-red-500 text-sm mt-1">
                  {profileErrors.username.message}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                {...profileRegister("agreed")}
                type="checkbox"
                className={`rounded ${
                  theme === "dark"
                    ? "bg-gray-700 text-green-500"
                    : " text-green-500"
                } focus:ring-green-500`}
              />
              <label
                htmlFor="terms"
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                I agree to the{" "}
                <a href="#" className="text-blue-500 hover:underline">
                  Terms and Conditions
                </a>
              </label>
            </div>
            {profileErrors.agreed && (
              <p className="text-red-500 text-sm mt-1">
                {profileErrors.agreed.message}
              </p>
            )}
            <button
              type="submit"
              disabled={!watch("agreed") || loading}
              className={`w-full bg-green-500 text-white font-bold py-3 rounded-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center text-lg ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? <Spinner /> : "Create Profile"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
