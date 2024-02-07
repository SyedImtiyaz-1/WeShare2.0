const path = require("path");
const express = require("express");
const http = require("http");
const moment = require("moment");
const socketio = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const mysql = require("mysql");


const PORT = process.env.PORT || 5003;

const app = express();
const server = http.createServer(app);

const io = socketio(server);

// SQLite setup
const db = new sqlite3.Database("weshareData.db", (err) => {
  if (err) {
    console.error("Error connecting to SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database");
    // Create a users table if it doesn't exist
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, roomid TEXT)", (createErr) => {
      if (createErr) {
        console.error("Error creating users table:", createErr);
      } else {
        console.log("Users table created successfully");
      }
    });
  }
});

app.use(express.static(path.join(__dirname, "public")));

let rooms = {};
let socketroom = {};
let socketname = {};
let micSocket = {};
let videoSocket = {};
let roomBoard = {};

io.on("connect", (socket) => {
  socket.on("join room", (roomid, username) => {
    socket.join(roomid);
    socketroom[socket.id] = roomid;
    socketname[socket.id] = username;
    micSocket[socket.id] = "on";
    videoSocket[socket.id] = "on";

    // SQLite: Insert user into the database
    db.run("INSERT INTO users (username, roomid) VALUES (?, ?)", [username, roomid], (err) => {
      if (err) {
        console.error("Error inserting user into the SQLite database:", err);
      } else {
        console.log("User inserted into the SQLite database");
      }
    });

    if (rooms[roomid] && rooms[roomid].length > 0) {
      rooms[roomid].push(socket.id);
      socket
        .to(roomid)
        .emit(
          "message",
          `${username} joined the room.`,
          "Bot",
          moment().format("h:mm a")
        );
      io.to(socket.id).emit(
        "join room",
        rooms[roomid].filter((pid) => pid != socket.id),
        socketname,
        micSocket,
        videoSocket
      );
    } else {
      rooms[roomid] = [socket.id];
      io.to(socket.id).emit("join room", null, null, null, null);
    }

    io.to(roomid).emit("user count", rooms[roomid].length);
  });

  socket.on("action", (msg) => {
    if (msg == "mute") micSocket[socket.id] = "off";
    else if (msg == "unmute") micSocket[socket.id] = "on";
    else if (msg == "videoon") videoSocket[socket.id] = "on";
    else if (msg == "videooff") videoSocket[socket.id] = "off";

    socket.to(socketroom[socket.id]).emit("action", msg, socket.id);
  });

  // ... Rest of the code remains unchanged

  socket.on("disconnect", () => {
    if (!socketroom[socket.id]) return;

    // SQLite: Delete user from the database
    db.run("DELETE FROM users WHERE username = ? AND roomid = ?", [socketname[socket.id], socketroom[socket.id]], (err) => {
      if (err) {
        console.error("Error deleting user from the SQLite database:", err);
      } else {
        console.log("User deleted from the SQLite database");
      }
    });

    socket
      .to(socketroom[socket.id])
      .emit(
        "message",
        `${socketname[socket.id]} left the chat.`,
        `Bot`,
        moment().format("h:mm a")
      );
    socket.to(socketroom[socket.id]).emit("remove peer", socket.id);
    var index = rooms[socketroom[socket.id]].indexOf(socket.id);
    rooms[socketroom[socket.id]].splice(index, 1);
    io.to(socketroom[socket.id]).emit(
      "user count",
      rooms[socketroom[socket.id]].length
    );
    delete socketroom[socket.id];
    console.log("--------------------");
    console.log(rooms[socketroom[socket.id]]);
  });
});

server.listen(PORT, () =>
  console.log(`Server is up and running on port ${PORT}`)
);
