const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Message");
const dotenv = require("dotenv");
const { sendMessage } = require("../controllers/chatController");
const handleVideoCallEvents = require("./video-call-events");
const socketMiddleWare = require("../middlewares/socketMiddleware");
dotenv.config();

// map to store online users, socketit

const onlineUsers = new Map();

// map to track typing status -> userId: boolean
const typingUser = new Map();

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,

      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000, // disconnect after 60 seconds of inactivity
  });

  // when a new socket connection is established

  // middlewares
  io.use(socketMiddleWare);

  io.on("connection", (socket) => {
    console.log("user connected", socket.id);
    let userId = null;

    // handle user connection and mark them online in db
    socket.on("user_connected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        socket.userId = userId;
        // onlineUsers.set(userId, socket.id);
        // socket.join(userId);
        // await User.findByIdAndUpdate(userId, {
        //   isOnline: true,
        //   lastSeen: new Date(),
        // });

        // // notify all user that this user is online

        // io.emit("user_status", { userId, isOnline: true });
        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, []);
        }

        onlineUsers.get(userId).push(socket?.id);
        socket.join(userId);
        // only mark the user that is online in the first tab
        if (onlineUsers.get(userId).length === 1) {
          await User.findByIdAndUpdate(userId, {
            isOnline: true,
            lastSeen: new Date(),
          });
        }
        io.emit("user_status", { userId, isOnline: true });
      } catch (err) {
        console.error("Error in user_connected:", err);
      }
    });

    // return online status of requested users
    socket.on("get_user_status", (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    // forward message to reciver if online
    socket.on("send_message", async (message) => {
      try {
        const receiverScoketId = onlineUsers.get(message.receiver?._id);
        if (receiverScoketId) {
          io.to(receiverScoketId).emit("receive_message", message);
        }
      } catch (err) {
        console.error("Error in send_message:", err);
        socket.emit("message_error", { message: "Message delivery failed" });
      }
    });

    // update the message as read and notify the sender
    socket.on("message_read", async (messageIds, senderId) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { messsageStatus: "read" } }
        );

        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit("message_status_update", {
              messageId,
              messsageStatus: "read",
            });
          });
        }
      } catch (err) {
        console.log(err, "Error in message_read");
        socket.emit("message_error", {
          message: "Updating message read failed",
        });
      }
    });

    // handle typing indicator and auto-stop after 3 sec

    socket.on("typing_start", async ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (!typingUser.has(userId)) {
        typingUser.set(userId, {});
      }
      const userTyping = typingUser.get(userId);

      if (userTyping[conversationId]) {
        clearTimeout(userTyping[conversationId]);
      }

      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });

      // auto stop after 3 sec

      userTyping[conversationId] = setTimeout(() => {
        delete userTyping[conversationId];
        socket.to(receiverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: false,
        });
      }, 3000);
      // userTyping[`${conversationId}_timeout`] = setTimeout(() => {
      //   userTyping[conversationId] = false;
      //   socket.to(receiverId).emit("user_typing", {
      //     userId,
      //     conversationId,
      //     isTyping: false,
      //   });
      // }, 3000);

      // // notify receiver
      // socket.to(receiverId).emit("user_typing", {
      //   userId,
      //   conversationId,
      //   isTyping: true,
      // });
    });

    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      // if (!typingUser.has(userId)) {
      //   const userTyping = typingUser.get(userId);
      //   userTyping[conversationId] = false;

      //   if (userTyping[`${conversationId}_timeout`]) {
      //     clearTimeout(userTyping[`${conversationId}_timeout`]);
      //     delete userTyping[`${conversationId}_timeout`];
      //   }
      // }

      // socket.to(receiverId).emit("user_typing", {
      //   userId,
      //   conversationId,
      //   isTyping: false,
      // });

      if (typingUser.has(userId)) {
        const userTyping = typingUser.get(userId);
        if (userTyping[conversationId]) {
          clearTimeout(userTyping[conversationId]);
          delete userTyping[conversationId];
        }
      }
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    // add or update the reaction

    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId: reactionUserid }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;

          // check if this user already reacted
          const existingReaction = message.reactions.findIndex(
            (r) => r?.user?.toString() === reactionUserid
          );

          if (existingReaction > -1) {
            const existing = message.reactions[existingReaction];
            if (existing.emoji === emoji) {
              message.reactions.splice(existingReaction, 1);
              console.log("inside the existing", existingReaction);
            } else {
              message.reactions[existingReaction].emoji = emoji;
            }
          } else {
            // add new reaction
            message.reactions.push({ user: reactionUserid, emoji });
          }

          await message.save();

          // repopulate message for frontend
          const populateMessage = await Message.findById(messageId)
            .populate("sender", "username profilePicture")
            .populate("receiver", "username profilePicture")
            .populate("reactions.user", "username");

          const reactionUpdated = {
            messageId,
            reactions: populateMessage.reactions,
          };

          const senderSocket = onlineUsers.get(
            populateMessage.sender?._id.toString()
          );

          const receiverSocket = onlineUsers.get(
            populateMessage.receiver?._id.toString()
          );

          if (senderSocket)
            io.to(senderSocket).emit("reaction_update", reactionUpdated);
          if (receiverSocket)
            io.to(receiverSocket).emit("reaction_update", reactionUpdated);
        } catch (error) {
          console.error("Error handling reaction:", error);
        }
      }
    );

    // handle video call
    handleVideoCallEvents(socket, io, onlineUsers);

    const handleDisconnected = async () => {
      if (!userId) return;

      try {
        // onlineUsers.delete(userId);
        const sockets = onlineUsers.get(userId) || [];
        const updated = sockets.filter((id) => id !== socket.id);

        if (updated.length === 0) {
          onlineUsers.delete(userId);

          // clearna all typing timeoutes
          if (typingUser.has(userId)) {
            const userTyping = typingUser.get(userId);
            Object.keys(userTyping).forEach((key) => {
              if (key.endsWith("_timeout")) clearTimeout(userTyping[key]);
            });

            typingUser.delete(userId);
          }
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          io.emit("user_status", {
            userId,
            isOnline: false,
            lastSeen: new Date(),
          });
        } else {
          onlineUsers.set(userId, updated);
        }

        socket.leave(userId);
      } catch (err) {
        console.log("error handling the disconnection", err);
      }
    };

    // disconnect
    socket.on("disconnect", handleDisconnected);
  });

  // attach the online usermap to the socket server for external use
  io.socketUserMap = onlineUsers;

  return io;
};

module.exports = initializeSocket;
