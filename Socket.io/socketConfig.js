const { Server } = require("socket.io");
const connectedPartners = {}; // partnerId -> socket.id
const connectedUsers = {};    // userId -> socket.id

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT"],
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Send current online lists to whoever just connected (e.g. admin opening the page)
    socket.emit("initialStatus", {
      partners: Object.keys(connectedPartners),
      users: Object.keys(connectedUsers),
    });

    // Register Partner Connection
    socket.on("registerPartner", (partnerId) => {
      if (partnerId) {
        connectedPartners[partnerId] = socket.id;
        console.log(`Partner Registered: ${partnerId} - Socket ID: ${socket.id}`);
        io.emit("updatePartnerStatus", { partnerId, status: "active" });
      }
    });

    // Register User Connection
    socket.on("registerUser", (userId) => {
      if (userId) {
        connectedUsers[userId] = socket.id;
        console.log(`User Registered: ${userId} - Socket ID: ${socket.id}`);
        io.emit("updateUserStatus", { userId, status: "active" });
      }
    });

    // Handle Disconnection (covers both partner and user)
    socket.on("disconnect", () => {
      let disconnectedPartner = null;
      for (let partnerId in connectedPartners) {
        if (connectedPartners[partnerId] === socket.id) {
          disconnectedPartner = partnerId;
          delete connectedPartners[partnerId];
          break;
        }
      }
      if (disconnectedPartner) {
        io.emit("updatePartnerStatus", { partnerId: disconnectedPartner, status: "inactive" });
      }

      let disconnectedUser = null;
      for (let userId in connectedUsers) {
        if (connectedUsers[userId] === socket.id) {
          disconnectedUser = userId;
          delete connectedUsers[userId];
          break;
        }
      }
      if (disconnectedUser) {
        io.emit("updateUserStatus", { userId: disconnectedUser, status: "inactive" });
      }

      console.log("Client disconnected:", socket.id);
    });
  });
};

module.exports = { setupSocket, connectedPartners, connectedUsers };