const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const socketMiddleWare = (socket, next) => {
  try {
    // Get token from either handshake auth or authorization header
    const authToken =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!authToken) {
      console.log("No token provided in socket handshake");
      return next(new Error("Authentication error"));
    }

    // Verify JWT
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);

    // Attach user info to socket
    socket.user = decoded;
    console.log("Socket Authenticated User:", socket.user);

    next(); // Allow connection
  } catch (error) {
    console.error("Error in socketMiddleware:", error);
    next(new Error("Authentication error")); // Correct way to reject
  }
};

module.exports = socketMiddleWare;
