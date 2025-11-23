const Message = require("../models/Message");

const Status = require("../models/Status");

exports.createStatus = async (req, res) => {
  try {
    let { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || "text";

    //handle file upload if exists
    if (file) {
      //upload to cloudinary
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return res.status(500).json({ message: "File upload failed" });
      }

      mediaUrl = uploadFile?.secure_url;
      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return res.status(400).json({ message: "Invalid file type" });
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return res
        .status(400)
        .json({ message: "Message content or media is required" });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Status expires in 24 hours
    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt,
    });
    await status.save();

    const populateStatus = await Status.findOne({ _id: status?._id })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    // emit socket event

    if (req.io && req.socketUserMap) {
      // borad cast to all connecting user expect the cretor
      for (const [connectingUserId, socketId] of req.socketUserMap) {
        if (connectingUserId !== userId) {
          req.io.to(socketId).emit("new_status", populateStatus);
        }
      }
    }

    return res
      .status(200)
      .json({ message: "status uploaded successfully", data: populateStatus });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const statuses = await Status.find({ expiresAt: { $gt: new Date() } })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ message: "Statuses fetched successfully", data: statuses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      const updatedStatus = await Status.findById(statusId)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture");

      // emit  socket event

      if (req.io && req.socketUserMap) {
        // borad cast to all connecting user expect the cretor
        const statusOwner = req.socketUserMap.get(status?.user?._id.toString());
        if (statusOwner) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: updatedStatus.viewers.length,
            viewers: updatedStatus.viewers,
          };

          req.io.to(statusOwner).emit("status_viewed", viewData);
        } else {
          console.log("status owner are not connected");
        }
      }
    } else {
      console.log("user already viewed the status");
    }

    return res
      .status(200)
      .json({ message: "Status viewed successfully", data: status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });
    if (status.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this status" });
    }
    await status.deleteOne();

    // emit socket event
    if (req.io && req.socketUserMap) {
      // borad cast to all connecting user expect the cretor
      for (const [connectingUserId, socketId] of req.socketUserMap) {
        if (connectingUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }

    return res.status(200).json({ message: "Status deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
