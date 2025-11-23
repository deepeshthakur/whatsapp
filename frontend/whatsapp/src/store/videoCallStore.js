import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

const userVideoCallStore = create(
  subscribeWithSelector((set, get) => ({
    currentCall: null,
    incomingCall: null,
    isCallActive: false,
    callType: null,

    localStream: null,
    remoteStream: null,
    isVideoEnabled: true,
    isAudioEnabled: true,

    peerConnection: null,
    iceCandidatesQueue: [],
    isCallModelOpen: false,
    callStatus: "idle",
    setCurrentCall: (call) => set({ currentCall: call }),
    setIncomingCall: (call) => set({ incomingCall: call }),
    setCallActive: (call) => set({ isCallActive: call }),
    setCallType: (callType) => set({ callType: callType }),
    setLocalStream: (stream) => set({ localStream: stream }),
    setRemoteStream: (stream) => set({ remoteStream: stream }),
    setPeerConnection: (pc) => set({ peerConnection: pc }),
    setCallModalOpen: (open) => set({ isCallModelOpen: open }),
    setCallStatus: (status) => set({ callStatus: status }),
    addIceCandidates: (candidate) => {
      const { iceCandidatesQueue } = get();
      set({ iceCandidatesQueue: [...iceCandidatesQueue, candidate] });
    },
    processQueuedCandidates: async () => {
      const { peerConnection, iceCandidatesQueue } = get();
      if (
        peerConnection &&
        peerConnection.remoteDescription &&
        iceCandidatesQueue.length > 0
      ) {
        for (const candidate of iceCandidatesQueue) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } catch (err) {
            console.error("ice candidates error", err);
          }
        }
        set({ iceCandidatesQueue: [] });
      }
    },

    toggleVideo: () => {
      const { localStream, isVideoEnabled } = get();
      if (localStream) {
        const videoTracks = localStream.getVideoTracks()[0];
        if (videoTracks) {
          videoTracks.enabled = !isVideoEnabled;
          set({ isVideoEnabled: !isVideoEnabled });
        }
      }
    },
    toggleAudio: () => {
      const { localStream, isAudioEnabled } = get();
      if (localStream) {
        const audioTracks = localStream.getAudioTracks()[0];
        if (audioTracks) {
          audioTracks.enabled = !isAudioEnabled;
          set({ isAudioEnabled: !isAudioEnabled });
        }
      }
    },
    endCall: () => {
      const { localStream, peerConnection } = get();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }

      set({
        currentCall: null,
        incomingCall: null,
        isCallActive: false,
        callType: null,
        localStream: null,
        remoteStream: null,
        isVideoEnabled: true,
        isAudioEnabled: true,
        peerConnection: null,
        iceCandidatesQueue: [],
        isCallModelOpen: false,
        callStatus: "idle",
      });

      // idle,calling,ringing,connecting,connected,ended
    },
    clearIncomingCall: () => {
      set({
        incomingCall: null,
      });
    },

    // actions
  }))
);

export default userVideoCallStore;
