import React, { useEffect, useRef, useState } from "react";
import useThemeStore from "../../store/ThemeStore";
import useUserStore from "../../store/useUserStore";
import { useChatStore } from "../../store/chatStore";
import { isToday, isYesterday, format } from "date-fns";
import whatsAppImage from "../../images/whatsapp_image.png";

import {
  FaLock,
  FaArrowLeft,
  FaVideo,
  FaEllipsisV,
  FaTimes,
  FaSmile,
  FaPaperclip,
  FaImage,
  FaFile,
  FaPaperPlane,
} from "react-icons/fa";
import MessageBubble from "./MessageBubble";
import EmojiPicker from "emoji-picker-react";
import VideoCallManager from "../videocall/VideoCallManager";
import { getSocket } from "../../service/chat.service";
import userVideoCallStore from "../../store/videoCallStore";
const isValidate = (date) => {
  return date instanceof Date && !isNaN(date);
};
const  socket  = getSocket();

const ChatWindow = ({ selectedContact, setSelectedContact }) => {
  const [message, setMessages] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreView, setFilePreView] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const typingTimeOutRef = useRef(null);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    messages,
    loading,
    conversations,
    currentConversation,
    setCurrentUser,
    fetchMessage,
    sendMessage,
    receiveMessage,
    markMessagesAsRead,

    deleteMessage,
    addReaction,
    startTyping,
    stopTyping,
    isUserTyping,
    isUserOnline,
    getUserLastSeen,
    clenUp,
    fetchConversations,
  } = useChatStore();

  // get online status and last seen
  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

  useEffect(() => {
    if (selectedContact?._id && conversations?.data?.length > 0) {
      const conversation = conversations?.data?.find((conv) =>
        conv.participants.some(
          (participant) => participant?._id === selectedContact?._id
        )
      );
      if (conversation?._id) {
        fetchMessage(conversation._id);
      }
    }
  }, [selectedContact, conversations]);

  useEffect(() => {
    fetchConversations();
  }, []);

  // scrolling
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // typing
  useEffect(() => {
    if (message && selectedContact) {
      startTyping(selectedContact?._id);
      if (typingTimeOutRef.current) {
        clearTimeout(typingTimeOutRef.current);
      }
      typingTimeOutRef.current = setTimeout(() => {
        stopTyping(selectedContact?._id);
      }, 1000);
    }

    return () => {
      if (typingTimeOutRef.current) {
        clearTimeout(typingTimeOutRef.current);
      }
    };
  }, [message, selectedContact, startTyping, stopTyping]);

  // handlefile change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowFileMenu(false);
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        setFilePreView(URL.createObjectURL(file));
      }
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact) {
      return;
    }
    setFilePreView(null);
    try {
      const formData = new FormData();
      formData.append("sender", user?._id);
      formData.append("receiver", selectedContact?._id);
      const status = online ? "delivered" : "send";
      formData.append("messsageStatus", status);
      if (message.trim()) {
        formData.append("content", message.trim());
      }

      // if there is a file include that to
      if (selectedFile) {
        formData.append("media", selectedFile, selectedFile.name);
      }

      if (!message.trim() && !selectedFile) {
        return;
      }

      await sendMessage(formData);

      // clear state
      setMessages("");
      setFilePreView(null);
      setSelectedFile(null);
      setShowFileMenu(false);
    } catch (error) {
      console.log(error, "failed to send message");
    }
  };

  const renderDateSperator = (date) => {
    if (!isValidate(date)) {
      return null;
    }

    let dateString;
    if (isToday(date)) {
      dateString = "Today";
    } else if (isYesterday(date)) {
      dateString = "Yesterday";
    } else {
      dateString = format(date, "EEEE, MMMM d");
    }

    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-2 rounded-full ${
            theme === "dark"
              ? "bg-gray-700 text-gray-300"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  // group message by date
  const groupedMessages = Array.isArray(messages)
    ? messages.reduce((acc, message) => {
        if (!message.createdAt) return acc;
        const date = new Date(message.createdAt);
        if (isValidate(date)) {
          const dateString = format(date, "yyyy-MM-dd");
          if (!acc[dateString]) {
            acc[dateString] = [];
          }
          acc[dateString].push(message);
        } else {
          console.error("Invalid date for message", message);
        }

        return acc;
      }, {})
    : {};

  Object.keys(groupedMessages).forEach((date) => {
    groupedMessages[date].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  });

  // 3️⃣ Sort dates: newest date first (Today → Yesterday → older)
  const sortedDates = Object.keys(groupedMessages).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const handleReaction = (messageId, emoji) => {
    console.log("inside handle", messageId, emoji);
    addReaction(messageId, emoji);
  };

  const handleVideoCall = () => {
    if (selectedContact && online) {
      const { initiateCall } = userVideoCallStore.getState();
      const avatar = selectedContact?.profilePicture;
      initiateCall(
        selectedContact?._id,
        selectedContact?.username,
        avatar,
        "video"
      );
    } else {
      alert("User is offline cannot connect the call");
    }
  };

  if (!selectedContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center mx-auto h-screen text-center">
        <div className="max-w-md">
          <img src={whatsAppImage} alt="chat-app" className="w-full h-auto" />
          <h2
            className={`text-3xl font-semibold mb-4 ${
              theme === "dark" ? "text-white" : "text-black"
            }`}
          >
            Select a chat to start messaging
          </h2>
          <p
            className={`t${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            } mb-6`}
          >
            Choose a contact from the list on the left side to start a
            conversation
          </p>

          <p
            className={`t${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            } text-sm mt-8 flex items-center justify-center gap-2`}
          >
            <FaLock className="h-4 w-4" />
            Your personal messages are end-to-end encrypted
          </p>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="flex-1 h-screen flex flex-col w-full">
        <div
          className={`p-4 ${
            theme === "dark"
              ? "bg-[#303430] text-white"
              : "bg-[rgb(239,242,245)] text-gray-600"
          } flex items-center`}
        >
          <button
            className="mr-2 focus:outline-none"
            onClick={() => setSelectedContact(null)}
          >
            <FaArrowLeft className=" h-6 w-6" />
          </button>
          <img
            src={selectedContact?.profilePicture}
            alt={selectedContact?.username}
            className="w-10 h-10 rounded-full"
          />
          <div className="ml-3 flex-grow ">
            <h2 className="text-start font-semibold">
              {selectedContact?.username}
            </h2>
            {isTyping ? (
              <div>Tying...</div>
            ) : (
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {online
                  ? "Online"
                  : lastSeen
                  ? `Last seen ${format(new Date(lastSeen), "HH:mm")}`
                  : "Offline"}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              className="focus:outline-none"
              onClick={handleVideoCall}
              title={online ? "Start Video Call" : "User is offline"}
            >
              <FaVideo className="h-5 w-5 text-green-500 hover:text-green-600" />
            </button>
            <button className="focus:outline-none">
              <FaEllipsisV className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto p-4 ${
            theme === "dark" ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)] "
          }`}
        >
          {sortedDates.map((date) => (
            <React.Fragment key={date}>
              {renderDateSperator(new Date(date))}
              {groupedMessages[date]
                .filter(
                  (msg) =>
                    msg.conversation === selectedContact?.conversation?._id
                )
                .map((msg) => (
                  <MessageBubble
                    key={msg._id || msg.tempId}
                    message={msg}
                    theme={theme}
                    currentUser={user}
                    onReact={handleReaction}
                    deleteMessage={deleteMessage}
                  />
                ))}
            </React.Fragment>
          ))}

          <div ref={messageEndRef} />
        </div>
        {filePreView && (
          <div className="relative p-2">
            {selectedFile?.type.startsWith("video/") ? (
              <video
                src={filePreView}
                controls
                className="w-80 object-cover rounded shadow-lg mx-auto "
              ></video>
            ) : (
              <img
                src={filePreView}
                alt="file-preview"
                className="w-80 object-cover rounded shadow-lg mx-auto"
              />
            )}

            <button
              onClick={() => {
                setSelectedFile(null);
                setFilePreView(null);
              }}
              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        )}
        <div
          className={`p-4 ${
            theme === "dark" ? "bg-[#303430]" : "bg-[rgb(239,242,245)]"
          } flex items-center space-x-2 relative`}
        >
          <button
            className="focus:outline-none"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <FaSmile
              className={`h-6 w-6 ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            />
          </button>
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute left-0 bottom-16 z-15"
            >
              <EmojiPicker
                onEmojiClick={(emojiObject) => {
                  setMessages((prev) => prev + emojiObject.emoji);
                  setShowEmojiPicker(false);
                  theme = { theme };
                }}
              />
            </div>
          )}
          <div className="relative ">
            <button
              className="focus:outline-none"
              onClick={() => setShowFileMenu(!showFileMenu)}
            >
              <FaPaperclip
                className={`h-6 w-6 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                } mt-2`}
              />
            </button>
            {showFileMenu && (
              <div
                className={`absolute bottom-full left-0 mb-2 ${
                  theme === "dark" ? "bg-gray-700" : "bg-white"
                } rounded-lg shadow-lg`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`flex items-center px-4 py-2 w-full transition-colors ${
                    theme === "dark" ? "bg-gray-100" : "bg-gray-600"
                  }`}
                >
                  <FaImage className="mr-2" /> Image/Video
                </button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`flex items-center px-4 py-2 w-full transition-colors  ${
                    theme === "dark" ? "bg-gray-100" : "bg-gray-600"
                  }`}
                >
                  <FaFile className="mr-2" /> Documents
                </button>
              </div>
            )}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessages(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            placeholder="Type a message"
            className={`flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-green-500 ${
              theme === "dark"
                ? "bg-gray-500 text-white border-gray-600"
                : "bg-white text-gray-800 border-gray-600"
            }`}
          />
          <button onClick={handleSendMessage} className="focus:outline-none">
            <FaPaperPlane className="h-6 w-6 text-green-500" />
          </button>
        </div>
      </div>
      <VideoCallManager socket={socket} />
    </>
  );
};

export default ChatWindow;
