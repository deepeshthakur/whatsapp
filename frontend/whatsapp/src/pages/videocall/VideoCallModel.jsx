import React, { useEffect, useMemo, useRef } from "react";
import userVideoCallStore from "../../store/videoCallStore";
import useThemeStore from "../../store/ThemeStore";
import useUserStore from "../../store/useUserStore";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaTimes,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";

const VideoCallModel = ({ socket }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const {
    currentCall,
    incomingCall,
    isCallActive,
    localStream,
    callType,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    peerConnection,
    setIncomingCall,
    iceCandidatesQueue,
    setCurrentCall,
    setCallType,
    isCallModelOpen,
    setCallModalOpen,
    endCall,
    callStatus,
    setCallStatus,
    setCallActive,
    setLocalStream,
    setRemoteStream,
    setPeerConnection,
    addIceCandidates,
    processQueuedCandidates,
    toggleVideo,
    toggleAudio,
    clearIncomingCall,
  } = userVideoCallStore();
  const { user } = useUserStore();
  const { theme } = useThemeStore();

  const rtcConfig = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
      },
      {
        urls: "stun:stun2.l.google.com:19302",
      },
    ],
  };

  // memorize display the user info and it is prevent the unnecessary re-render
  const displayInfo = useMemo(() => {
    if (incomingCall && !isCallActive) {
      return {
        name: incomingCall.callerName,
        avatar: incomingCall.callerAvatar,
      };
    } else if (currentCall) {
      return {
        name: currentCall.participantName,
        avatar: currentCall.participantAvatar,
      };
    }

    return null;
  }, [incomingCall, isCallActive, currentCall]);

  // connnection detetction
  useEffect(() => {
    if (peerConnection && remoteStream) {
      setCallStatus("connected");
      setCallActive(true);
    }
  }, [peerConnection, remoteStream, setCallActive, setCallStatus]);

  // set up local video stream when local stream change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // set up remote video stream when remote stream change
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = false; // VERY IMPORTANT ✅
    }
  }, [remoteStream]);

  // initalize media stream
  const initalizeMedia = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 640, height: 480 } : false,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("getUserMedia (incognito?)", err.name, err.message);
      setCallStatus("failed");
      throw err;
    }
  };

  // peer connection
  const createPeerConnection = (stream, role) => {
    const pc = new RTCPeerConnection(rtcConfig);

    // add the local tracks immediately
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // handle ice candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const participantId =
          currentCall?.participantId || incomingCall?.callerId;
        const callId = currentCall?.callId || incomingCall?.callId;

        if (participantId && callId) {
          socket.emit("webrtc_ice_candidate", {
            candidate: event.candidate,
            receiverId: participantId,
            callId: callId,
          });
        }
      }
    };
    // handle remote stream

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const stream = new MediaStream([event.track]);
        setRemoteStream(stream);
      }
    };

    // monitor the connection changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        setCallStatus("failed");
        setTimeout(() => {
          handleEndCall();
        }, 2000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`${role} : Ice state`, pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log(`${role}: signaling state`, pc.signalingState);
    };

    setPeerConnection(pc);
    return pc;
  };

  // caller initalize call after acceptance
  const initializeCallerCall = async () => {
    try {
      setCallStatus("connecting");

      // get media
      const stream = await initalizeMedia(callType === "video");
      // create peer connection with offer
      const pc = createPeerConnection(stream, "caller");

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
      });

      await pc.setLocalDescription(offer);
      socket.emit("webrtc_offer", {
        offer: offer,
        receiverId: currentCall?.participantId,
        callId: currentCall?.callId,
      });
    } catch (error) {
      console.log("caller error", error);
      setCallStatus("failed");
      setTimeout(() => {
        handleEndCall();
      }, 2000);
    }
  };

  // reciever : answer the call
  const handleAnswerCall = async () => {
    try {
      setCallStatus("connecting");
      const stream = await initalizeMedia(callType === "video");
      const pc = createPeerConnection(stream, "receiver");

      socket.emit("accept_call", {
        callerId: incomingCall?.callerId,
        callId: incomingCall?.callId,
        receiverInfo: {
          username: user?.username,
          profilePicture: user?.profilePicture,
        },
      });

      setCurrentCall({
        callId: incomingCall?.callId,
        participantId: incomingCall?.callerId,
        participantName: incomingCall?.callerName,
        participantAvatar: incomingCall?.callerAvatar,
      });
      clearIncomingCall();

      // 👇 user just clicked “Answer” ⇒ safe to unmute
    } catch (err) {
      handleEndCall();
      console.error("receiver error", err);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      socket.emit("reject_call", {
        callerId: incomingCall?.callerId,
        callId: incomingCall?.callId,
      });
    }
    endCall();
  };
  const handleEndCall = () => {
    const participantId = currentCall?.participantId || incomingCall?.callerId;
    const callId = currentCall?.callId || incomingCall?.callId;

    if (participantId && callId) {
      socket.emit("call_ended", {
        callId: callId,
        participantId: participantId,
      });
    }
    endCall();
  };

  //socket event listner

  useEffect(() => {
    if (!socket) return;

    // call accepted caller flow
    const handleCallAccepted = ({ receiverName }) => {
      if (currentCall) {
        setTimeout(() => {
          initializeCallerCall();
        }, 500);
      }
    };

    const handleCallRejected = () => {
      setCallStatus("rejected");
      setTimeout(() => {
        endCall();
      }, 2000);
    };

    const handleCallEnded = () => {
      endCall();
    };

    const handleWebRtcOffer = async ({ offer, senderId, callId }) => {
      let pc = peerConnection;

      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        // process queued ice candidates
        await processQueuedCandidates();

        // create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc_answer", { answer, receiverId: senderId, callId });
      } catch (err) {
        console.error("receiver offer error", err);
      }
    };

    const handleWebRTCAnswer = async ({ answer, senderId, callId }) => {
      if (!peerConnection) return;
      if (peerConnection.signalingState === "closed") return;

      try {
        // current caller signaling
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        // process queued ice candidates
        await processQueuedCandidates();
        // check receiver

        const receiver = peerConnection.getReceivers();
      } catch (err) {
        console.error("receiver answer error", err);
      }
    };

    // receiver ice candidates
    const handleWebRTCIceCandidates = async ({ candidate, senderId }) => {
      if (peerConnection && peerConnection.signalingState !== "closed") {
        if (peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("ice candidate addes");
          } catch (err) {
            console.log("ice candidates error", err);
          }
        } else {
          console.log("candidate has been added into the queue");
          addIceCandidates(candidate);
        }
      }
    };

    // register all the events listner
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_ended", handleCallEnded);
    socket.on("webrtc_offer", handleWebRtcOffer);
    socket.on("webrtc_answer", handleWebRTCAnswer);
    socket.on("webrtc_ice_candidate", handleWebRTCIceCandidates);

    console.log("socket listners registered");

    return () => {
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
      socket.off("webrtc_offer", handleWebRtcOffer);
      socket.off("webrtc_answer", handleWebRTCAnswer);
      socket.off("webrtc_ice_candidate", handleWebRTCIceCandidates);
    };
  }, [socket, peerConnection, currentCall, incomingCall, user]);

  if (!isCallModelOpen && !incomingCall) {
    return null;
  }

  const shouldShowActiveCall =
    isCallActive || callStatus === "calling" || callStatus === "connecting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div
        className={`relative w-full h-full max-w-4xl max-h-4xl rounded-lg overflow-hidden ${
          theme === "dark" ? "bg-gray-900 " : "bg-white"
        }`}
      >
        {/* incoming call ui */}

        {incomingCall && !isCallActive && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center mb-8">
              <div className="w-32 h-32 rounded-full bg-gray-300 mx-auto mb-4 overflow-hidden">
                <img
                  src={displayInfo?.avatar}
                  alt={displayInfo?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.target.src = "/placeholder.svg")}
                />
              </div>
              <h2
                className={`text-2xl font-semibold mb-2 ${
                  theme === "dark" ? "text-white" : "text-gray-800"
                }`}
              >
                {displayInfo?.name}
              </h2>
              <p
                className={`text-lg ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Incoming {callType} call...
              </p>
            </div>
            <div className="flex space-x-6 ">
              <button
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                onClick={handleRejectCall}
              >
                <FaPhoneSlash className="w-6 h-6" />
              </button>
              <button
                className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors"
                onClick={handleAnswerCall}
              >
                <FaVideo className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Active call */}
        {shouldShowActiveCall && (
          <div className="relative w-full h-full">
            <audio ref={remoteAudioRef} autoPlay playsInline />

            {callType === "video" && (
              <video
                className={`w-full h-full object-cover bg-gray-800 
                  ${remoteStream ? "block" : "hidden"}
                `}
                ref={remoteVideoRef}
                autoPlay
                playsInline
              />
            )}

            {(!remoteStream || callType !== "video") && (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center ">
                <div className="text-center ">
                  <div className="w-32 h-32 rounded-full bg-gray-600 mx-auto mb-4 overflow-hidden">
                    <img
                      src={displayInfo?.avatar}
                      alt={displayInfo?.name}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.target.src = "/placeholder.svg")}
                    />
                  </div>
                  <p className="text-white text-xl ">
                    {callStatus === "calling"
                      ? `Calling... ${displayInfo?.name} `
                      : callStatus === "connecting"
                      ? "connecting..."
                      : callStatus === "connected"
                      ? displayInfo?.name
                      : callStatus === "failed"
                      ? "connection failed"
                      : displayInfo?.name}
                  </p>
                </div>
              </div>
            )}

            {/* local video picture in the picture */}

            {callType === "video" && localStream && (
              <div className="absolute top-4 right-4 h-36 z-50 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {/* call status */}
            <div className="absolute top-4 left-4">
              <div
                className={`px-4 py-2 rounded-full ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                } bg-opacity-75`}
              >
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-white " : "text-gray-800"
                  }`}
                >
                  {callStatus === "connected" ? "Connected" : callStatus}
                </p>
              </div>
            </div>

            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-4">
                {callType === "video" && (
                  <button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isVideoEnabled
                        ? "bg-gray-600 hover:bg-gray-700 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    } `}
                  >
                    {isVideoEnabled ? (
                      <FaVideo className="w-5 h-5" />
                    ) : (
                      <FaVideoSlash className="w-5 h-5" />
                    )}
                  </button>
                )}
                {(callType === "audio" || callType === "video") && (
                  <button
                    onClick={toggleAudio}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isAudioEnabled
                        ? "bg-gray-600 hover:bg-gray-700 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    } `}
                  >
                    {isAudioEnabled ? (
                      <FaMicrophone className="w-5 h-5" />
                    ) : (
                      <FaMicrophoneSlash className="w-5 h-5" />
                    )}
                  </button>
                )}
                <button
                  className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                  onClick={handleEndCall}
                >
                  <FaPhoneSlash className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {callStatus === "calling" && (
          <button
            onClick={handleEndCall}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoCallModel;
