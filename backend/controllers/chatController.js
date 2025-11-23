const Message = require("../models/Message");

const Conversation = require("../models/Conversatation");

exports.sendMessage = async (req, res) => {
  try {
    const { sender, receiver, content, messsageStatus } = req.body;
    console.log("body data",req.body)
    const file = req.file;

    if (!sender || !receiver) {
      console.log("❌ Sender or Receiver missing:", { sender, receiver });
      return res.status(400).json({ message: "Sender and receiver are required" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [sender, receiver] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [sender, receiver],
      });
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return res.status(500).json({ message: "File upload failed" });
      }

      imageOrVideoUrl = uploadFile?.secure_url;
      if (file.mimetype.startsWith("image")) contentType = "image";
      else if (file.mimetype.startsWith("video")) contentType = "video";
      else return res.status(400).json({ message: "Invalid file type" });
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return res.status(400).json({ message: "Message content or media is required" });
    }

    const message = new Message({
      conversation: conversation._id,
      sender,
      receiver,
      content,
      contentType,
      imageOrVideoUrl,
      messsageStatus,
    });

    await message.save();

    if (message.content) {
      conversation.lastmessage = message._id;
    }

    conversation.unreadCount += 1;
    await conversation.save();

    const populatedMessage = await Message.findById(message?._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");

    // emit event for real-time
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(receiver);
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("receive_message", populatedMessage);
        message.messsageStatus = "delivered";
        await message.save();
      }
    }

    return res.status(200).json({
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (err) {
    console.error("🔥 Error in sendMessage:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


// get all converrsations for a user

exports.getAllConversations = async (req, res) => {
  const userId = req.user.userId;
  console.log(userId);

  try {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastmessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 });
    console.log(await Conversation.find());

    return res.status(200).json({
      message: "Conversations fetched successfully",
      data: conversations,
    });
    console.log(conversations);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ message: "You are not a participant of this conversation" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort({ createdAt: -1 });

    //reset unread count
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messsageStatus: { $in: ["sent", "delivered"] },
      },
      {
        $set: { messsageStatus: "read" },
      }
    );

    conversation.unreadCount = 0;
    await conversation.save();

    return res
      .status(200)
      .json({ message: "Messages fetched successfully", data: messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  const { messageIds } = req?.body;
  const userId = req?.user?.userId;
  try {
    let messages = await Message.find({
      _id: { $in: messageIds },
      reciever: userId,
    });
    await Message.updateMany(
      { _id: { $in: messageIds }, receiver: userId },
      {
        $set: { messsageStatus: "read" },
      }
    );

    // notify to original sender
    if (req.io && req.socketUserMap) {
      for (const message of messages) {
        const senderSocketId = req.socketUserMap.get(message.sender.toString());
        if (senderSocketId) {
          const updatedMessage = {
            _id: message?._id,
            messsageStatus: "read",
          };
          req.io.to(senderSocketId).emit("message_read", updatedMessage);
          await message.save();
        }
      }
    }
    return res
      .status(200)
      .json({ message: "Messages marked as read successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req?.user?.userId;
  try {
    let MessageDelete = await Message.findById(messageId);
    if (!MessageDelete) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (MessageDelete.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this message" });
    }

    // emit socket event
    if (req.io && req.socketUserMap) {
      // borad cast to all connecting user expect the cretor
      const receiverSocketId = req.socketUserMap.get(
        MessageDelete.receiver.toString()
      );
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("message_deleted", messageId);
      }
    }
    await Message.deleteOne();
    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
