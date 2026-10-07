const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const games = {};

function createEmptyGame() {
  return {
    board: Array(9).fill(null),
    currentTurn: 'X',
    gameOver: false,
    players: {},
  };
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

io.on('connection', (socket) => {
  const room = socket.handshake.query.room || 'default';
  socket.join(room);

  if (!games[room]) {
    games[room] = createEmptyGame();
  }
  const game = games[room];

  const assignedCount = Object.keys(game.players).length;
  if (assignedCount < 2) {
    const symbol = assignedCount === 0 ? 'X' : 'O';
    game.players[socket.id] = symbol;
    socket.emit('assignSymbol', symbol);
    console.log(`Player connected as ${symbol} in room ${room}:`, socket.id);
  } else {
    socket.emit('assignSymbol', 'spectator');
    console.log(`Spectator connected in room ${room}:`, socket.id);
  }

  socket.emit('gameState', {
    board: game.board,
    currentTurn: game.currentTurn,
    gameOver: game.gameOver,
  });

  socket.on('move', (index) => {
    const symbol = game.players[socket.id];
    if (!symbol) return;
    if (game.gameOver) return;
    if (symbol !== game.currentTurn) return;
    if (game.board[index]) return;

    game.board[index] = symbol;

    const winner = checkWinner(game.board);
    if (winner) {
      game.gameOver = true;
    } else if (game.board.every((cell) => cell)) {
      game.gameOver = true;
    } else {
      game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X';
    }

    io.to(room).emit('gameState', {
      board: game.board,
      currentTurn: game.currentTurn,
      gameOver: game.gameOver,
      winner,
    });
  });

  socket.on('resetGame', () => {
    game.board = Array(9).fill(null);
    game.currentTurn = 'X';
    game.gameOver = false;
    io.to(room).emit('gameState', {
      board: game.board,
      currentTurn: game.currentTurn,
      gameOver: game.gameOver,
      winner: null,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected from room ${room}:`, socket.id);
    delete game.players[socket.id];
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`);
});