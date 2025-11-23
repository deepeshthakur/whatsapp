const handleVideoCallEvents = (socket, io, onlineUsers) => {
  // INITIATE CALL
  socket.on(
    "initiate_call",
    ({ callerId, receiverId, callType, callerInfo }) => {
      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        const callId = `${callerId}-${receiverId}-${Date.now()}`;

        io.to(receiverSocketId).emit("incoming_call", {
          callerId,
          callerName: callerInfo.username,
          callerAvatar: callerInfo.profilePicture,
          callType,
          callId,
        });
      } else {
        console.log("server error receiver is offile");
        socket.emit("call failed", { reason: "user is offline" });
      }
    }
  );

  // ACCEPT CALL
  socket.on("accept_call", ({ callerId, callId, receiverInfo }) => {
    const callerSocketId = onlineUsers.get(callerId);

    if (callerSocketId) {
      io.to(callerSocketId).emit("call_accepted", {
        receiverName: receiverInfo.username,
        receiverAvatar: receiverInfo.profilePicture,
        callId,
      });
    } else {
      console.log("server :caller not found");
    }
  });

  // REJECT CALL
  socket.on("reject_call", ({ callerId, callId }) => {
    const callerSocketId = onlineUsers.get(callerId);

    if (callerSocketId) {
      io.to(callerSocketId).emit("call_rejected", { callId });
    } else {
      console.log("server caller not found");
    }
  });

  // END CALL
  socket.on("call_ended", ({ participantId, callId }) => {
    const participantSocketId = onlineUsers.get(participantId);

    if (!participantSocketId) return;

    io.to(participantSocketId).emit("call_ended", { callId });
  });

  // WEBRTC OFFER
  socket.on("webrtc_offer", ({ offer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (!receiverSocketId) return;

    io.to(receiverSocketId).emit("webrtc_offer", {
      offer,
      senderId: socket.userId,
      callId,
    });

    console.log(`✅ OFFER forwarded to ${receiverId}`);
  });

  // WEBRTC ANSWER
  socket.on("webrtc_answer", ({ answer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (!receiverSocketId) return;

    io.to(receiverSocketId).emit("webrtc_answer", {
      answer,
      senderId: socket.userId,
      callId,
    });

    console.log(`✅ ANSWER forwarded to ${receiverId}`);
  });

  // WEBRTC ICE CANDIDATE ✅ FIXED
  socket.on("webrtc_ice_candidate", ({ candidate, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (!receiverSocketId) return;

    // ✅ MUST forward using the SAME event name!
    io.to(receiverSocketId).emit("webrtc_ice_candidate", {
      candidate,
      senderId: socket.userId,
      callId,
    });

    console.log(`✅ ICE forwarded to ${receiverId}`);
  });
};

module.exports = handleVideoCallEvents;
