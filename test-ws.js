const { io } = require("socket.io-client");

const socket = io("http://localhost:8000/chat", {
  auth: {
    token: "ТВОЙ_JWT_ТОКЕН" // Потрібно отримати дійсний JWT токен!
  }
});

socket.on("connect", () => {
  console.log("Connected!");
  socket.emit("getOnlineUsers"); // тестовий запит
});

socket.on("onlineUsers", (data) => {
  console.log("Online users:", data);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});