// app.js — FIXED
require("dotenv").config();
const express= require("express");
const cors= require("cors");
require("./DB/dbConnection");
const http= require("http");
const { setupSocket } = require("./Socket.io/socketConfig");

const userRouter    = require("./router/userRouter");
const patnerRouter  = require("./router/patenerRouter");
const bookingRouter = require("./router/bookingRoutes");
const vehicleRouter = require("./router/vehcileRoutes");
const stationRouter = require("./router/chargingStationRoutes");
const paymentController = require("./controller/paymentController");
const fs =require("fs")
const Server = express();
const notific = http.createServer(Server);

// ── Socket.io — setup ONCE only ───────────────────────────────────────────────
const io = setupSocket(notific);   

Server.use((req, res, next) => {
  req.io = io;
  next();
});

// ── Stripe webhook —  ───────────────────────────
Server.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook
);

// ── Normal middleware ─────────────────────────────────────────────────────────
Server.use(express.json());
Server.use(express.urlencoded({ extended: true }));
Server.use(cors());

// ── Routes ────────────────────────────────────────────────────────────────────
Server.use(userRouter);
Server.use(patnerRouter);
Server.use(bookingRouter);
Server.use(stationRouter);
Server.use(vehicleRouter);
// Server.use("/uploads", express.static("uploads"));g
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads')
}

// ── Health check ──────────────────────────────────────────────────────────────
Server.get("/", (req, res) => {
  res.status(200).send("<h1>Server is Running Successfully 😊</h1>");
});

const PORT = process.env.PORT || 5000;
notific.listen(PORT, () => {
  console.log(`Server is Running Successfully on port ${PORT} 😊`);
});