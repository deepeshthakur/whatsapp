import React, { useCallback, useEffect } from "react";
import userVideoCallStore from "../../store/videoCallStore";
import useUserStore from "../../store/useUserStore";
import VideoCallModel from "./VideoCallModel";

const VideoCallManager = ({ socket }) => {
  const {
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setCallModalOpen,
    endCall,
    setCallStatus,
  } = userVideoCallStore();
  const { user } = useUserStore();

  useEffect(() => {
    if (!socket) return;

    //handle incoming call
    const handleIncomingCall = ({
      callerId,
      callerName,
      callerAvatar,
      callType,
      callId,
    }) => {
      setIncomingCall({ callerId, callerName, callerAvatar, callId });
      setCallType(callType);
      setCallModalOpen(true);
      setCallStatus("ringing");
    };

    const handleCallEnded = ({ reason }) => {
      setCallStatus("failed");
      setTimeout(() => {
        endCall();
      }, 2000);
    };
    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_failed", handleCallEnded);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_failed", handleCallEnded);
    };
  }, [
    socket,
    setIncomingCall,
    setCallModalOpen,
    setCallType,
    setCallStatus,
    endCall,
  ]);

  // memorize the function to initaite the call
  const initiateCall = useCallback(
    (receiverId, receiverName, receiverAvatar, callType = "video") => {
      const callId = `${user?._id}-${receiverId}-${Date.now()}`;
      const callData = {
        callId,
        participantId: receiverId,
        participantName: receiverName,
        participantAvatar: receiverAvatar,
      };

      setCurrentCall(callData);
      setCallType(callType);
      setCallModalOpen(true);
      setCallStatus("calling");

      // emit the call inititate
      socket.emit("initiate_call", {
        callerId: user?._id,
        receiverId,
        callType,
        callerInfo: {
          username: user.username,
          profilePicture: user.profilePicture,
        },
      });
    },
    [user, socket, setCurrentCall, setCallType, setCallModalOpen, setCallStatus]
  );

  // expose the initate call function to store the data
  useEffect(() => {
    userVideoCallStore.getState().initiateCall = initiateCall;
  }, [initiateCall]);
  return <VideoCallModel socket={socket} />;
};

export default VideoCallManager;
