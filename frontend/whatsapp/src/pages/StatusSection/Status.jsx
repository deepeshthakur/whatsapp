import React, { useEffect, useState } from "react";
import LayOut from "../../components/LayOut";
import useThemeStore from "../../store/ThemeStore";
import useUserStore from "../../store/useUserStore";
import useStatusStore from "../../store/statusStore";
import StatusPreview from "./StatusPreview";
import { motion } from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import { FaCamera, FaEllipsisH, FaPlus } from "react-icons/fa";
import formatTimestamp from "../../utils/FormatTime";
import StatusList from "./StatusList";

const Status = () => {
  const [previewContact, setPreviewContact] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showOption, setShowOption] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newstatus, setNewStatus] = useState("");
  const [filePreView, setFilePreview] = useState(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  // status store
  const {
    statues,
    loading,
    error,
    fetchStatus,
    createStatus,
    viewStatus,
    deleteStatus,
    getStatusViewers,
    getUserStatus,
    groupStatus,
    getOtherUsersStatus,
    clearError,
    cleanUpSocket,
    reset,
    initializeSocket,
  } = useStatusStore();

  const userStatus = getUserStatus(user?._id);
  const otherStatus = getOtherUsersStatus(user);

  useEffect(() => {
    fetchStatus();
    initializeSocket();
    return () => {
      cleanUpSocket();
    };
  }, [user?._id]);

  // clear the error when page is mounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);

      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleCreateStatus = async () => {
    if (!newstatus.trim() && !selectedFile) return;

    try {
      await createStatus({
        content: newstatus,
        file: selectedFile,
      });

      setNewStatus("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowCreateModal(false);
    } catch (err) {
      console.error("error creating the status", err);
    }
  };

  const handleViewStatus = async (statusId) => {
    try {
      await viewStatus(statusId);
    } catch (err) {
      console.error("error while viewing the status", err);
    }
  };

  const handleDeleteStaus = async (statusId) => {
    try {
      await deleteStatus(statusId);
      setShowOption(false);
      handlePreviewClose();
    } catch (err) {
      console.error("error while deleting the status", err);
    }
  };

  const handlePreviewClose = () => {
    setPreviewContact(null);
    setCurrentStatusIndex(0);
  };

  const handlePreviewNext = () => {
    if (currentStatusIndex < previewContact.statues.length - 1)
      setCurrentStatusIndex((prev) => prev + 1);
    else {
      handlePreviewClose();
    }
  };

  const handlePreviewPrev = () => {
    setCurrentStatusIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleStatusPreview = (contact, statusIndex = 0) => {
    setPreviewContact(contact);
    setCurrentStatusIndex(statusIndex);

    if (contact.statues[statusIndex]) {
      handleViewStatus(contact.statues[statusIndex].id);
    }
  };
  return (
    <>
      <LayOut
        isStatusPreview={!!previewContact}
        isStatusPreviewContent={
          previewContact && (
            <StatusPreview
              contact={previewContact}
              currentIndex={currentStatusIndex}
              onClose={handlePreviewClose}
              onNext={handlePreviewNext}
              onPrev={handlePreviewPrev}
              onDelete={handleDeleteStaus}
              loading={loading}
              theme={theme}
              currentUser={user}
            />
          )
        }
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`flex-1 h-screen border-r ${
            theme === "dark"
              ? "bg-[rgb(12,19,24)] text-white border-gray-600"
              : "bg-gray-100 text-black"
          }`}
        >
          <div
            className={`flex justify-between items-center shadow-md  ${
              theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"
            } p-4 `}
          >
            <h2 className="text-2xl font-semibold">Status</h2>
          </div>

          {error && (
            <div className="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-2">
              <span className="block sm:inline">{error}</span>
              <button
                onClick={clearError}
                className="float-right text-red-500 hover:text-red-700"
              >
                <RxCross2 className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="overflow-y-auto h-[calc(100vh -64px)]">
            <div
              className={`flex p-3 space-x-4 shadow-md  ${
                theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"
              }  `}
            >
              <div
                className="relative cursor-pointer "
                onClick={() =>
                  userStatus
                    ? handleStatusPreview(userStatus)
                    : setShowCreateModal(true)
                }
              >
                <img
                  src={user?.profilePicture}
                  alt={user?.username}
                  className="h-12 w-12 rounded-full object-cover"
                />
                {userStatus ? (
                  <>
                    <svg
                      className="absolute top-0 left-0 w-12 h-12 "
                      viewBox="0 0 100 100 "
                    >
                      {userStatus?.statues?.map((_, index) => {
                        const circumFerence = 2 * Math.PI * 48;
                        const segmentLength =
                          circumFerence / userStatus.statues.length;
                        const offset = segmentLength * index;
                        return (
                          <circle
                            key={index}
                            cx="50"
                            cy="50"
                            r="48"
                            fill="none"
                            stroke="#25D366"
                            strokeWidth="4"
                            strokeDasharray={`${segmentLength - 5} 5`}
                            strokeDashoffset={-offset}
                            transform={`rotate(-90 50 50)`}
                          />
                        );
                      })}
                    </svg>
                    <button
                      className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full "
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateModal(true);
                      }}
                    >
                      <FaPlus className="h-2 w-2" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full "
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateModal(true);
                      }}
                    >
                      <FaPlus className="h-2 w-2" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex flex-col items-start flex-1 ">
                <p className="font-semibold">My Status</p>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {userStatus
                    ? `${userStatus?.statues?.length} Status${
                        userStatus?.statues?.length > 1 ? "es" : ""
                      } ${formatTimestamp(
                        userStatus?.statues[userStatus?.statues.length - 1]
                          .timestamp
                      )}`
                    : "Tap to add status update "}
                </p>
              </div>
              {userStatus && (
                <button
                  className="ml-auto"
                  onClick={() => setShowOption(!showOption)}
                >
                  <FaEllipsisH
                    className={`h-5 w-5 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  />
                </button>
              )}
            </div>

            {/* options menu */}
            {showOption && userStatus && (
              <div
                className={`shadow-md p-2 ${
                  theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"
                }`}
              >
                <button
                  className="w-full text-left text-green-500 py-2 hover:bg-gray-100 px-2 rounded flex items-center"
                  onClick={() => {
                    setShowCreateModal(true);
                    setShowOption(false);
                  }}
                >
                  <FaCamera className="inline-block mr-2" /> Add Status
                </button>
                <button
                  className="w-full text-left text-blue-500 py-2 hover:bg-gray-100 px-2 rounded "
                  onClick={() => {
                    handleStatusPreview(userStatus);
                    setShowOption(false);
                  }}
                >
                  View Status
                </button>
              </div>
            )}
            {loading && (
              <div className="flex justify-center items-center p-8 ">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            )}
            {/* recent updates from other users */}
            {!loading && otherStatus.length > 0 && (
              <div
                className={`p-4 space-y-4 shadow-md mt-4 ${
                  theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"
                }`}
              >
                <h3
                  className={`font-semibold ${
                    theme === " dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Recent Updates
                </h3>
                {otherStatus.map((contact, index) => (
                  <React.Fragment>
                    <StatusList
                      contact={contact}
                      onPreview={() => handleStatusPreview(contact)}
                      theme={theme}
                    />
                    {index < otherStatus.length - 1 && (
                      <hr
                        className={`${
                          theme === "dark"
                            ? "border-gray-700"
                            : "border-gray-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* empty state  */}
            {!loading && statues.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center ">
                <div
                  className={`text-6xl mb-4 ${
                    theme === "dark" ? "text-gray-600" : "text-gray-300"
                  }`}
                >
                  📱
                </div>
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  No Status updated yet
                </h3>
                <p
                  className={`text-sm  ${
                    theme === "dark" ? "text-gray-500" : "text-gray-600"
                  }`}
                >
                  Be the first to share a status update
                </p>
              </div>
            )}
          </div>

          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div
                className={`p-6 rounded-lg max-w-md w-full mx-4  ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-4 ${
                    theme === "dark" ? "text-white" : "text-black"
                  }`}
                >
                  Create Status
                </h3>
                {filePreView && (
                  <div className="mb-4">
                    {selectedFile?.type.startsWith("video/") ? (
                      <video
                        src={filePreView}
                        controls
                        className="w-full h-32 object-cover rounded "
                      ></video>
                    ) : (
                      <img
                        src={filePreView}
                        alt="file-preview"
                        className="w-full h-32 object-cover rounded "
                      />
                    )}
                  </div>
                )}
                <textarea
                  value={newstatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="What's on your mind ?"
                  className={`w-full p-3 border rounded-lg mb-4 ${
                    theme === "dark"
                      ? "bg-gray-700 text-white border-gray-600"
                      : "bg-white text-black border-gray-300"
                  }`}
                  rows={3}
                />

                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="mb-4 "
                />
                <div className="flex justify-end space-x-3 ">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewStatus("");
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    disabled={loading}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleCreateStatus}
                    disabled={loading || (!newstatus && !selectedFile)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create Status"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </LayOut>
    </>
  );
};

export default Status;
