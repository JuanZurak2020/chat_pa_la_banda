const app = require("express")();
const checkPassword = require("./mongoConection");
const express = require("express");
const server = require("http").createServer(app);
const port = process.env.PORT || 3130;

const session = require("express-session");
const bodyParser = require("body-parser");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const sessionMiddleware = session({ secret: "changeit", resave: false, saveUninitialized: false });
app.use(sessionMiddleware);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

let DUMMY_USER = {
  id: 1,
  username: "john"
};

passport.use(
    new LocalStrategy((username, password, done) => {
      checkPassword(username, password).then(r => {
        if (r.response != null) {
          DUMMY_USER = {
            id:r.response._id,
            username: r.response.nickname,
          }
          return done(null, DUMMY_USER);
        } else {
          console.log("wrong credentials");
          return done(null, false);
        }
      }).catch(r => {
        console.log(r);
        return done(null, false);
      });
    })
);

app.get("/", (req, res) => {
  const isAuthenticated = !!req.user;
  if (isAuthenticated) {
    console.log(`user is authenticated, session is ${req.session.id}`);
  } else {
    console.log("unknown user");
  }
  res.sendFile(isAuthenticated ? "index.html" : "login.html", { root: __dirname });
});

app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/",
    })
);

app.post("/logout", (req, res) => {
  console.log(`logout ${req.session.id}`);
  const socketId = req.session.socketId;
  if (socketId && io.of("/").sockets.get(socketId)) {
    console.log(`forcefully closing socket ${socketId}`);
    io.of("/").sockets.get(socketId).disconnect(true);
  }
  req.logout();
  res.cookie("connect.sid", "", { expires: new Date() });
  res.redirect("/");
});

passport.serializeUser((user, cb) => {
  console.log(`serializeUser ${user.id}`);
  cb(null, user.id);
});

passport.deserializeUser((id, cb) => {
  console.log(`deserializeUser ${id}`);
  cb(null, DUMMY_USER);
});

const io = require('socket.io')(server);

// convert a connect middleware to a Socket.IO middleware
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
  if (socket.request.user) {
    next();
  } else {
    next(new Error('unauthorized'))
  }
});

io.on('connect', (socket) => {
  const session = socket.request.session;
  console.log(`saving sid ${socket.id} in session ${session.id}`);
  session.socketId = socket.id;
  session.save();

  socket.on('chat message', msg => {
    io.emit('chat message', socket.request.user.username + ' | ' + msg);
    io.emit('sound', msg);
  });
  socket.on('emoji', msg => {
    const emoji = msg.split('emoji>');
    io.emit('emoji', {emoji:emoji[1], name:socket.request.user.username});
  })
  socket.on('rola', msg => {
    const rola = msg.split('rola>');
    io.emit('rola', {url:rola[1], name:socket.request.user.username});
  })
});

server.listen(port, () => {
  console.log(`application is running at: http://localhost:${port}`);
});
