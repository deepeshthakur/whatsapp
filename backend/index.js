const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const chatRouter = require("./routes/chatRoutes");
const initializeSocket = require("./services/socketService");
const statusRoutes = require("./routes/statusRoutes");
const http = require("http");

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

// const corsOptions = {
//   origin: process.env.FRONTEND_URL ,
//   credentials: true,
// };

// app.use(cors(corsOptions));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      process.env.FRONTEND_URL
    ],
    credentials: true,
  })
);

// middlewares

app.use(express.json()); // parse body data
app.use(cookieParser()); // parse cookies or tokens on every request
app.use(bodyParser.urlencoded({ extended: true }));

// db connection
const connectDb = require("./config/dbConnect");

connectDb();

//create server
const server = http.createServer(app);
const io = initializeSocket(server);

// apply sockets before the routes

app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRouter);
app.use("/api/status", statusRoutes);
// Database connection

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});