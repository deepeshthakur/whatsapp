import { create } from "zustand";
import { getSocket } from "../service/chat.service";
import axiosInstance from "../service/url.service";
const useStatusStore = create((set, get) => ({
  // state

  statues: [],
  loading: false,
  error: null,

  setStatus: (statues) => set({ statues }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error: error }),

  // initalize the socket listner
  initializeSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    // Real time status event
    socket.on("new_status", (newstatus) => {
      set((state) => ({
        statues: state.statues.some((s) => s._id === newstatus._id)
          ? state.statues
          : [newstatus, ...state.statues],
      }));
    });
    socket.on("status_deleted", (statusid) => {
      set((state) => ({
        statues: state.statues.filter((s) => s._id !== statusid),
      }));
    });
    socket.on("status_viewed", (statusid, viewers) => {
      set((state) => ({
        statues: state.statues.map((stats) =>
          stats._id === statusid ? { ...stats, viewers } : stats
        ),
      }));
    });
  },

  cleanUpSocket: () => {
    const socket = getSocket();
    if (!socket) return;
    socket.off("new_status");
    socket.off("status_deleted");
    socket.off("status_viewed");
  },

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("status");
      set({ statues: data.data || [], loading: false });
      return data;
    } catch (error) {
      console.error("error fetching error", error);

      set({ error: error.message, loading: false });
    }
  },

  createStatus: async (statusData) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      if (statusData.file) {
        formData.append("media", statusData.file);
      }
      if (statusData.content?.trim()) {
        formData.append("content", statusData.content.trim());
      }
      const { data } = await axiosInstance.post("status", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // add to status in local state
      if (data.data) {
        set((state) => ({
          statues: state.statues.some((s) => s._id === data.data._id)
            ? state.statues
            : [data.data, ...state.statues],
        }));
      }
      set({loading :false});
      return data.data;
    } catch (err) {
      console.error("error creating status", err);
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // view the status
  viewStatus: async (statusId) => {
    try {
      set({ loading: true, error: null });
      await axiosInstance.put(`status/${statusId}/view`);
      set((state) => ({
        statues: state.statues.map((status) =>
          status._id === statusId ? { ...status } : status
        ),
      }));
      set({ loading: false });
    } catch (err) {
      console.error("failed to view status", err);
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
    }
  },
  deleteStatus: async (statusid) => {
    try {
      set({ loading: true, error: null });
      await axiosInstance.delete(`status/${statusid}`);
      set((state) => ({
        statues: state.statues.filter((s) => s._id !== statusid),
      }));
      set({ loading: false });
    } catch (err) {
      console.error("failed to delte the  status", err);
      set({ error: err?.response?.data?.message || err.message });
    }
  },

  getStatusViewers: async (statusid) => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get(`status/${statusid}/viewers`);
      set({ loading: false });
      return data.data;
    } catch (err) {
      console.error("error getting the data", err);
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      throw err;
    }
  },

  // helper function for group status
  groupStatus: () => {
    const { statues } = get();
    return statues.reduce((acc, status) => {
      const statusUserId = status.user?._id;
      if (!acc[statusUserId]) {
        acc[statusUserId] = {
          id: statusUserId,
          name: status?.user?.username,
          avatar: status?.user?.profilePicture,
          statues: [],
        };
      }
      acc[statusUserId].statues.push({
        id: status._id,
        media: status.content,
        contentType: status.contentType,
        viewers: status.viewers,
        timestamp: status.createdAt,
      });

      return acc;
    }, {});
  },

  getUserStatus: (userId) => {
    const groupedStatus = get().groupStatus();
    return userId ? groupedStatus[userId] : null;
  },

  getOtherUsersStatus: (userId) => {
    const groupedStatus = get().groupStatus();
    return Object.values(groupedStatus).filter(
      (contact) => contact.id !== userId
    );
  },

  // clear error
  clearError: () => set({ error: null }),

  //reset the all states
  reset: () => {
    set({ statues: [], error: null, loading: false });
  },
}));

export default useStatusStore;
