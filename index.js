const { createServer } = require("http");
const { Server } = require("socket.io");
require('dotenv').config();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "https://tic-tac-toe-sand-omega.vercel.app",
    methods: ["GET", "POST"],
  },
});

const allUsers = {};
const allRooms = [];

io.on("connection", (socket) => {
  allUsers[socket.id] = {
    socket: socket,
    online: true,
    playing: false, // Initialize playing state
  };

  console.log(`User connected: ${socket.id}`);

  socket.on("request_to_play", (data) => {
    const currentUser = allUsers[socket.id];
    currentUser.playerName = data.playerName;

    let opponentPlayer;

    for (const key in allUsers) {
      const user = allUsers[key];
      if (user.online && !user.playing && socket.id !== key) {
        opponentPlayer = user;
        break;
      }
    }

    if (opponentPlayer) {
      allRooms.push({
        player1: opponentPlayer,
        player2: currentUser,
      });

      currentUser.socket.emit("OpponentFound", {
        opponentName: opponentPlayer.playerName,
        playingAs: "circle",
      });

      opponentPlayer.socket.emit("OpponentFound", {
        opponentName: currentUser.playerName,
        playingAs: "cross",
      });

      currentUser.socket.on("playerMoveFromClient", (data) => {
        opponentPlayer.socket.emit("playerMoveFromServer", {
          ...data,
        });
      });

      opponentPlayer.socket.on("playerMoveFromClient", (data) => {
        currentUser.socket.emit("playerMoveFromServer", {
          ...data,
        });
      });

      currentUser.playing = true; // Set playing state
      opponentPlayer.playing = true; // Set playing state
    } else {
      currentUser.socket.emit("OpponentNotFound");
    }
  });

  socket.on("disconnect", function () {
    const currentUser = allUsers[socket.id];
    if (currentUser) {
      currentUser.online = false;
      currentUser.playing = false;

      for (let index = 0; index < allRooms.length; index++) {
        const { player1, player2 } = allRooms[index];

        if (player1.socket.id === socket.id) {
          player2.socket.emit("opponentLeftMatch");
          break;
        }

        if (player2.socket.id === socket.id) {
          player1.socket.emit("opponentLeftMatch");
          break;
        }
      }
      console.log(`User disconnected: ${socket.id}`);
    }
  });
});

httpServer.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
