import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCog, FaUserCircle, FaWhatsapp } from "react-icons/fa";
import { MdRadioButtonChecked } from "react-icons/md";
import useThemeStore from "../store/ThemeStore";
import useUserStore from "../store/useUserStore";
import useLayOutStore from "../store/LayOutStore";

const SideBar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const { activeTab, setActive, selectedContact } = useLayOutStore();

  // ✅ Handle screen resizing
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Sync route with active tab
  useEffect(() => {
    const path = location.pathname;
    if (path === "/") setActive("chats");
    else if (path === "/status") setActive("status");
    else if (path === "/user-profile") setActive("profile");
    else if (path === "/setting") setActive("setting");
  }, [location, setActive]);

  // ✅ Hide sidebar when on mobile & contact is open
  if (isMobile && selectedContact) return null;

  const getIconColor = (tabName) => {
    const isActive = activeTab === tabName;
    if (isActive) return theme === "dark" ? "text-gray-800" : "text-green-600";
    return theme === "dark" ? "text-gray-300" : "text-gray-600";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${
        isMobile
          ? "fixed bottom-0 left-0 right-0 h-16 flex-row justify-around"
          : "w-16 h-screen flex-col justify-between"
      } flex items-center py-4 shadow-lg
      ${
        theme === "dark"
          ? "bg-gray-800 border-gray-600"
          : "bg-[rgb(239,242,254)] border-gray-300"
      } border-r-2`}
    >
      {/* Chats */}
      <Link
        to="/"
        className={`p-2 rounded-full focus:outline-none ${
          activeTab === "chats" ? "bg-gray-300 shadow-sm" : ""
        } ${!isMobile && "mb-8"}`}
      >
        <FaWhatsapp className={`h-6 w-6 ${getIconColor("chats")}`} />
      </Link>

      {/* Status */}
      <Link
        to="/status"
        className={`p-2 rounded-full focus:outline-none ${
          activeTab === "status" ? "bg-gray-300 shadow-sm" : ""
        } ${!isMobile && "mb-8"}`}
      >
        <MdRadioButtonChecked className={`h-6 w-6 ${getIconColor("status")}`} />
      </Link>
      {!isMobile && <div className="flex-grow" />}
      <Link
        to="/user-profile"
        className={`p-2 rounded-full focus:outline-none ${
          activeTab === "profile" ? "bg-gray-300 shadow-sm" : ""
        } ${!isMobile && "mb-8"}`}
      >
        {user?.profilePicture ? (
          <img
            src={user?.profilePicture}
            alt="user"
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <FaUserCircle className={`h-6 w-6 ${getIconColor("profile")}}`} />
        )}
      </Link>

      <Link
        to="/setting"
        className={`p-2 rounded-full focus:outline-none ${
          activeTab === "setting" ? "bg-gray-300 shadow-sm" : ""
        } ${!isMobile && "mb-8"}`}
      >
        <FaCog className={`h-6 w-6 ${getIconColor("status")}`} />
      </Link>
    </motion.div>
  );
};

export default SideBar;
