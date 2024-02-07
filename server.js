const path = require("path");
const express = require("express");
const http = require("http");
const moment = require("moment");
const socketio = require("socket.io");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5002;
const MONGO_URI = "YOUR_MONGODB_URI";

const app = express();
const server = http.createServer(app);

const io = socketio(server);

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

  socket.on("video-offer", (offer, sid) => {
    socket
      .to(sid)
      .emit(
        "video-offer",
        offer,
        socket.id,
        socketname[socket.id],
        micSocket[socket.id],
        videoSocket[socket.id]
      );
  });

  socket.on("video-answer", (answer, sid) => {
    socket.to(sid).emit("video-answer", answer, socket.id);
  });

  socket.on("new icecandidate", (candidate, sid) => {
    socket.to(sid).emit("new icecandidate", candidate, socket.id);
  });

  socket.on("message", (msg, username, roomid) => {
    io.to(roomid).emit("message", msg, username, moment().format("h:mm a"));
  });

  socket.on("getCanvas", () => {
    if (roomBoard[socketroom[socket.id]])
      socket.emit("getCanvas", roomBoard[socketroom[socket.id]]);
  });

  socket.on("draw", (newx, newy, prevx, prevy, color, size) => {
    socket
      .to(socketroom[socket.id])
      .emit("draw", newx, newy, prevx, prevy, color, size);
  });

  socket.on("clearBoard", () => {
    socket.to(socketroom[socket.id]).emit("clearBoard");
  });

  socket.on("store canvas", (url) => {
    roomBoard[socketroom[socket.id]] = url;
  });

  socket.on("disconnect", () => {
    if (!socketroom[socket.id]) return;
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

    //toDo: push socket.id out of rooms
  });
});

server.listen(PORT, () =>
  console.log(`Server is up and running on port ${PORT}`)
);

// // -------------------------------------------------------------------------

// const express = require("express");
// const http = require("http");
// const path = require("path");
// const moment = require("moment");
// const socketio = require("socket.io");
// const passport = require("passport");
// const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const mongoose = require("mongoose");
// const session = require("express-session");
// const MongoStore = require("connect-mongo")(session);

// const PORT = process.env.PORT || 5002;
// const MONGO_URI =
//   "mongodb+srv://weshare:weshare123@weshare-meet.n8ls5fg.mongodb.net/?retryWrites=true&w=majority";
// const GOOGLE_CLIENT_ID =
//   "514279368463-lgl72960c3e5kbs6uqrkcm7ufsisi2j7.apps.googleusercontent.com";
// const GOOGLE_CLIENT_SECRET = "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";

// mongoose.connect(MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
// const db = mongoose.connection;
// db.on("error", console.error.bind(console, "MongoDB connection error:"));
// db.once("open", () => {
//   console.log("Connected to MongoDB");
// });

// const app = express();
// const server = http.createServer(app);
// const io = socketio(server);

// const userSchema = new mongoose.Schema({
//   googleId: String,
//   username: String,
//   email: String,
//   profileImage: String,
// });

// const User = mongoose.model("User", userSchema);

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: GOOGLE_CLIENT_ID,
//       clientSecret: GOOGLE_CLIENT_SECRET,
//       callbackURL: "http://localhost:5002/auth/google/callback",
//     },
//     (accessToken, refreshToken, profile, done) => {
//       User.findOne({ googleId: profile.id }, (err, user) => {
//         if (err) return done(err);

//         if (!user) {
//           const newUser = new User({
//             googleId: profile.id,
//             username: profile.displayName,
//             email: profile.emails[0].value,
//             profileImage: profile.photos[0].value,
//           });

//           newUser.save((err, savedUser) => {
//             if (err) return done(err);
//             return done(null, savedUser);
//           });
//         } else {
//           return done(null, user);
//         }
//       });
//     }
//   )
// );

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser((id, done) => {
//   User.findById(id, (err, user) => {
//     done(err, user);
//   });
// });

// app.use(express.static(path.join(__dirname, "public")));

// app.use(
//   session({
//     secret: "your-secret-key",
//     resave: false,
//     saveUninitialized: true,
//     store: new MongoStore({ mongooseConnection: mongoose.connection }),
//   })
// );

// app.use(passport.initialize());
// app.use(passport.session());

// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "index.html"));
// });

// app.get(
//   "/auth/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );

// app.get(
//   "/auth/google/callback",
//   passport.authenticate("google", { failureRedirect: "/" }),
//   (req, res) => {
//     res.redirect("/");
//   }
// );

// app.get("/logout", (req, res) => {
//   req.logout();
//   res.redirect("/");
// });

// io.on("connect", (socket) => {
//   socket.on("join room", (roomid, username) => {
//     socket.join(roomid);
//     socketroom[socket.id] = roomid;
//     socketname[socket.id] = username;
//     micSocket[socket.id] = "on";
//     videoSocket[socket.id] = "on";

//     if (rooms[roomid] && rooms[roomid].length > 0) {
//       rooms[roomid].push(socket.id);
//       socket
//         .to(roomid)
//         .emit(
//           "message",
//           `${username} joined the room.`,
//           "Bot",
//           moment().format("h:mm a")
//         );
//       io.to(socket.id).emit(
//         "join room",
//         rooms[roomid].filter((pid) => pid != socket.id),
//         socketname,
//         micSocket,
//         videoSocket
//       );
//     } else {
//       rooms[roomid] = [socket.id];
//       io.to(socket.id).emit("join room", null, null, null, null);
//     }

//     io.to(roomid).emit("user count", rooms[roomid].length);
//   });

//   socket.on("action", (msg) => {
//     if (msg == "mute") micSocket[socket.id] = "off";
//     else if (msg == "unmute") micSocket[socket.id] = "on";
//     else if (msg == "videoon") videoSocket[socket.id] = "on";
//     else if (msg == "videooff") videoSocket[socket.id] = "off";

//     socket.to(socketroom[socket.id]).emit("action", msg, socket.id);
//   });

//   socket.on("video-offer", (offer, sid) => {
//     socket
//       .to(sid)
//       .emit(
//         "video-offer",
//         offer,
//         socket.id,
//         socketname[socket.id],
//         micSocket[socket.id],
//         videoSocket[socket.id]
//       );
//   });

//   socket.on("video-answer", (answer, sid) => {
//     socket.to(sid).emit("video-answer", answer, socket.id);
//   });

//   socket.on("new icecandidate", (candidate, sid) => {
//     socket.to(sid).emit("new icecandidate", candidate, socket.id);
//   });

//   socket.on("message", (msg, username, roomid) => {
//     io.to(roomid).emit("message", msg, username, moment().format("h:mm a"));
//   });

//   socket.on("getCanvas", () => {
//     if (roomBoard[socketroom[socket.id]])
//       socket.emit("getCanvas", roomBoard[socketroom[socket.id]]);
//   });

//   socket.on("draw", (newx, newy, prevx, prevy, color, size) => {
//     socket
//       .to(socketroom[socket.id])
//       .emit("draw", newx, newy, prevx, prevy, color, size);
//   });

//   socket.on("clearBoard", () => {
//     socket.to(socketroom[socket.id]).emit("clearBoard");
//   });

//   socket.on("store canvas", (url) => {
//     roomBoard[socketroom[socket.id]] = url;
//   });

//   io.emit("user", req.user);

//   socket.on("disconnect", () => {
//     if (!socketroom[socket.id]) return;
//     socket
//       .to(socketroom[socket.id])
//       .emit(
//         "message",
//         `${socketname[socket.id]} left the chat.`,
//         `Bot`,
//         moment().format("h:mm a")
//       );
//     socket.to(socketroom[socket.id]).emit("remove peer", socket.id);
//     var index = rooms[socketroom[socket.id]].indexOf(socket.id);
//     rooms[socketroom[socket.id]].splice(index, 1);
//     io.to(socketroom[socket.id]).emit(
//       "user count",
//       rooms[socketroom[socket.id]].length
//     );
//     delete socketroom[socket.id];
//     console.log("--------------------");
//     console.log(rooms[socketroom[socket.id]]);
//   });
// });

// server.listen(PORT, () =>
//   console.log(`Server is up and running on port ${PORT}`)
// );
