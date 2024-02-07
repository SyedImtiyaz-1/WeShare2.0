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
    // Create a messages table if it doesn't exist
    db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, roomid TEXT, username TEXT, content TEXT, timestamp TEXT)");
  }
});

app.use(express.static(path.join(__dirname, "public")));

let rooms = {};
let socketroom = {};
let socketname = {};
let micSocket = {};
let videoSocket = {};
let roomBoard = {};

io.on('connect', socket => {
  socket.on("join room", (roomid, username) => {
    socket.join(roomid);
    socketroom[socket.id] = roomid;
    socketname[socket.id] = username;
    micSocket[socket.id] = 'on';
    videoSocket[socket.id] = 'on';

    if (rooms[roomid] && rooms[roomid].length > 0) {
      rooms[roomid].push(socket.id);
      socket.to(roomid).emit('message', `${username} joined the room.`, 'Bot', moment().format(
        "h:mm a"
      ));
      io.to(socket.id).emit('join room', rooms[roomid].filter(pid => pid != socket.id), socketname, micSocket, videoSocket);
    } else {
      rooms[roomid] = [socket.id];
      io.to(socket.id).emit('join room', null, null, null, null);
    }

    io.to(roomid).emit('user count', rooms[roomid].length);
  });  

    socket.on("action", (msg) => {
      if (msg == "mute") micSocket[socket.id] = "off";
      else if (msg == "unmute") micSocket[socket.id] = "on";
      else if (msg == "videoon") videoSocket[socket.id] = "on";
      else if (msg == "videooff") videoSocket[socket.id] = "off";
      
      socket.to(socketroom[socket.id]).emit("action", msg, socket.id);
    });
    

    socket.on('message', (msg, username, roomid) => {
      // Emit the message to all clients in the room
      io.to(roomid).emit('message', msg, username, moment().format("h:mm a"));
  
      // Store the message in the database
      db.run("INSERT INTO messages (roomid, username, content, timestamp) VALUES (?, ?, ?, ?)",
        [roomid, username, msg, moment().format("YYYY-MM-DD HH:mm:ss")],
        (err) => {
          if (err) {
            console.error("Error inserting message into the SQLite database:", err);
          } else {
            console.log("Message inserted into the SQLite database");
          }
        });
    });
    
    
    socket.on("disconnect", () => {
      if (!socketroom[socket.id]) return;
      delete socketroom[socket.id];
      
      // SQLite: Delete user from the database
      db.close((err) => {
        if (err) {
          console.error("Error closing SQLite database:", err.message);
        } else {
          console.log("SQLite database connection closed");
        }
      });
    });
  });
  

server.listen(PORT, () =>
  console.log(`Server is up and running on port ${PORT}`)
);
