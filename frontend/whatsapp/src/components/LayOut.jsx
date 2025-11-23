import React, { useEffect, useState } from "react";
import useLayOutStore from "../store/LayOutStore";
import useThemeStore from "../store/ThemeStore";
import { useLocation } from "react-router-dom";
import SideBar from "./SideBar";
import { AnimatePresence, motion } from "framer-motion";

import ChatWindow from "../pages/chatSection/ChatWindow";
import {  FaSignInAlt } from "react-icons/fa";
const LayOut = ({
  children,
  isThemeDialogOpen,
  toggleThemeDialog,
  isStatusPreview,
  isStatusPreviewContent,
}) => {
  const selectedContact = useLayOutStore((state) => state.selectedContact);
  const setSelectedContact = useLayOutStore(
    (state) => state?.setSelectedContact
  );
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const handleReSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleReSize);
    return () => {
      window.removeEventListener("resize", handleReSize);
    };
  }, []);

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-[#111b21] text-white" : "bg-gray-100"
      } flex relative`}
    >
      {!isMobile && <SideBar />}

      <div
        className={`flex-1 flex overflow-hidden ${isMobile ? "flex-col" : ""}`}
      >
        <AnimatePresence initial={false}>
          {(!selectedContact || !isMobile) && (
            <motion.div
              key="chatlist"
              initial={{ x: isMobile ? "-100%" : 0 }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween" }}
              className={`w-full md:w-2/5 h-full ${isMobile ? "ph-16" : ""}`}
            >
              {children}
            </motion.div>
          )}
          {(selectedContact || !isMobile) && (
            <motion.div
              key="chatWindo"
              initial={{ x: isMobile ? "-100%" : 0 }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween" }}
              className={`w-full h-full}`}
            >
              <ChatWindow
                selectedContact={selectedContact}
                setSelectedContact={setSelectedContact}
                isMobile={isMobile}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {isMobile && <SideBar />}
      {isThemeDialogOpen && (
        <div
          className="fixed inset-0 bg-gray-900 flex items-center justify-center bg-opacity-50 z-50"
          onClick={toggleThemeDialog}
        >
          <div
            className={`${
              theme === "dark"
                ? "bg-[#202c33] text-white"
                : "bg-white text-black"
            } p-6 rounded-lg shadow-lg max-w-sm w-full `}
          >
            <h2 className="text-2xl font-semibold mb-4">Choose a theme</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="light"
                  checked={theme === "light"}
                  onChange={() => setTheme("light")}
                  className="from-raido text-blue-600"
                />
                <span>Light</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="dark"
                  checked={theme === "dark"}
                  onChange={() => setTheme("dark")}
                  className="from-raido text-blue-600"
                />
                <span>Dark</span>
              </label>
            </div>
            <div className="flex items-center justify-center w-full">
              <button
                onClick={toggleThemeDialog}
                className="mt-8 p-3 flex items-center justify-center w-full bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200 "
              >
                Close
              </button>
            </div>
           
          </div>
        </div>
      )}

      {isStatusPreview && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          {isStatusPreviewContent}
        </div>
      )}
    </div>
  );
};

export default LayOut;
