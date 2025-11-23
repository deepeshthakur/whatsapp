import { create } from "zustand";
import { getSocket } from "../service/chat.service";
import axiosInstance from "../service/url.service";

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),

  // socket event listners setup
  initsocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // remove exiting listeners to prevent diplicate handlers
    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("send_message");
    socket.off("message_error");
    socket.off("message_deleted");

    // listend for incoming message
    socket.on("receive_message", (message) => {
      get().receiveMessage(message);
    });

    // confirm messsage delivery
    socket.on("send_message", (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? { ...msg } : msg
        ),
      }));
    });

    // update message status like read delivered
    socket.on("message_status_update", ({ messageId, messsageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messsageStatus } : msg
        ),
      }));
    });

    // handle the reaction on message
    socket.on("reaction_update", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg?._id === messageId ? { ...msg, reactions } : msg
        ),
      }));
    });

    // handle the deleted message
    socket.on("message_deleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
    });

    // handle the message error
    socket.on("message_error", (error) => {
      console.error("message error", error);
    });

    // handle user typing
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUser = new Map(state.typingUsers);
        if (!newTypingUser.has(conversationId)) {
          newTypingUser.set(conversationId, new Set());
        }
        const typingSet = newTypingUser.get(conversationId);
        if (isTyping) {
          typingSet.add(userId);
        } else {
          typingSet.delete(userId);
        }

        return { typingUsers: newTypingUser };
      });
    });

    // track user's online and offline status
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, { isOnline, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });

    // emit status check for all user in conversation list
    const { conversations } = get();

    if (conversations?.data?.length > 0) {
      conversations.data?.forEach((conv) => {
        // find the "other" participant in the conversation
        const otherUser = conv.participants.find(
          (p) => p._id !== get().currentUser._id
        );

        if (otherUser?._id) {
          socket.emit("get_user_status", otherUser._id, (status) => {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers);
              newOnlineUsers.set(otherUser?._id, {
                isOnline: status?.isOnline,
                lastSeen: status?.lastSeen,
              });
              return { onlineUsers: newOnlineUsers };
            });
          });
        }
      });
    }
  },

  // set current user

  setCurrentUser: (user) => set({ currentUser: user }),

  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("/chats/conversations");
      set({ conversations: data, loading: false });
      get().initsocketListeners();
      return data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });

      return null;
    }
  },

  // fetch message for a conversation
  fetchMessage: async (conversationId) => {
    if (!conversationId) return;
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get(
        `/chats/conversations/${conversationId}/messages`
      );
      const messageArray = data.data || data || [];
      set({
        messages: messageArray,
        currentConversation: conversationId,
        loading: false,
      });

      // mark as unread as read
      const { markMessagesAsRead } = get();
      markMessagesAsRead();

      return messageArray;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      return [];
    }
  },

  // send message
  sendMessage: async (formData) => {
    const senderId = formData.get("sender");
    const receiverId = formData.get("receiver");
    const media = formData.get("media");
    const content = formData.get("content");
    const messsageStatus = formData.get("messsageStatus");

    const socket = getSocket();
    const { conversations } = get();
    let conversationId = null;

    if (conversations?.data?.length > 0) {
      const conversation = conversations.data.find(
        (conv) =>
          conv.participants.some((p) => p._id === senderId) &&
          conv.participants.some((p) => p._id === receiverId)
      );

      if (conversation) {
        conversationId = conversation._id;
        set({ currentConversation: conversationId });
      }
    }

    // temp message before actual response
    const tempId = `temp-${Date.now()}`;
    const optimistMessage = {
      _id: tempId,
      sender: { _id: senderId },
      receiver: { _id: receiverId },
      content: content,
      createdAt: new Date().toISOString(),
      conversation: conversationId,
      messsageStatus,
      contentType: media
        ? media.type.startsWith("image")
          ? "image"
          : "video"
        : "text",
      imageOrVideoUrl:
        media && typeof media === "string" ? URL.createObjectURL(media) : null,
    };

    set((state) => ({
      messages: [...state.messages, optimistMessage],
    }));

    try {
      const { data } = await axiosInstance.post(
        "/chats/send-message",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const messageData = data.data || data;

      // replace optimist message with the real one
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? messageData : msg
        ),
      }));

      if (socket) {
        socket.emit("send_message", messageData);
      }
    } catch (err) {
      console.log("error sending message", err);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? { ...msg, messsageStatus: "failed" } : msg
        ),
        error: err?.response?.data?.message || err.message,
      }));
      throw err;
    }
  },

  // receiver message
  receiveMessage: (message) => {
    if (!message) return;
    const { currentConversation, currentUser, messages } = get();
    const messageExist = messages.some((msg) => msg._id === message._id);
    if (messageExist) return;

    if (message.conversation === currentConversation) {
      set((state) => ({
        messages: [...state.messages, message],
      }));

      // automatically mark as read
      if (message?.receiver?._id === currentUser?._id) {
        const { markMessagesAsRead } = get();
        markMessagesAsRead();
      }
    }

    // update conversation preview
    set((state) => {
      const updateConversations = state.conversations?.data?.map((conv) => {
        if (conv._id === message.conversation) {
          return {
            ...conv,
            lastMessage: message,
            unreadCount:
              message?.receiver?._id === currentUser?._id
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0,
          };
        }
        return conv;
      });

      return {
        conversations: {
          ...state.conversations,
          data: updateConversations,
        },
      };
    });
  },

  // mark as read
  markMessagesAsRead: async () => {
    const { messages, currentUser } = get();
    if (!messages.length || !currentUser) return;
    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messsageStatus !== "read" &&
          msg.receiver?._id === currentUser?._id
      )
      .map((msg) => msg._id)
      .filter(Boolean);
    if (unreadIds.length === 0) return;
    try {
      const { data } = await axiosInstance.put("/chats/message/read", {
        messageIds: unreadIds,
      });

      set((state) => ({
        messages: state.message.map((msg) =>
          unreadIds.include(msg._id) ? { ...msg, messsageStatus: "read" } : msg
        ),
      }));

      const socket = getSocket();
      if (socket) {
        socket.emit("message_read", {
          messageIds: unreadIds,
          sender: messages[0].sender?._id,
        });
      }
    } catch (err) {
      console.error("failed to mark message as read", err);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chats/message/${messageId}`);
      set((state) => ({
        messages: state.messages?.filter((msg) => msg._id !== messageId),
      }));

      return true;
    } catch (err) {
      console.error("failed to delete message", err);
      set({ error: err?.response?.data?.message || err.message });
      return false;
    }
  },

  // add or change the reactions
  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();
    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: currentUser?._id,
      });
    }
  },

  // start typing
  startTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation) {
      socket.emit("typing_start", {
        receiverId,
        conversationId: currentConversation,
      });
    }
  },

  // stop typing
  stopTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation) {
      socket.emit("typing_stop", {
        receiverId,
        conversationId: currentConversation,
      });
    }
  },

  // is user typing
  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    if (
      !typingUsers.has(currentConversation) ||
      !currentConversation ||
      !userId
    )
      return false;

    return typingUsers.get(currentConversation).has(userId);
  },

  // is user online
  isUserOnline: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.isOnline || false;
  },
  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || false;
  },

  clenUp: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
    });
  },
}));
