const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let board = Array(9).fill(null);
let currentTurn = 'X';
let gameOver = false;
const players = {};

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
  const assignedCount = Object.keys(players).length;

  if (assignedCount < 2) {
    const symbol = assignedCount === 0 ? 'X' : 'O';
    players[socket.id] = symbol;
    socket.emit('assignSymbol', symbol);
    console.log(`Player connected as ${symbol}:`, socket.id);
  } else {
    socket.emit('assignSymbol', 'spectator');
    console.log('Spectator connected:', socket.id);
  }

  socket.emit('gameState', { board, currentTurn, gameOver });

  socket.on('move', (index) => {
    const symbol = players[socket.id];
    if (!symbol) return;
    if (gameOver) return;
    if (symbol !== currentTurn) return;
    if (board[index]) return;

    board[index] = symbol;

    const winner = checkWinner(board);
    if (winner) {
      gameOver = true;
    } else if (board.every((cell) => cell)) {
      gameOver = true;
    } else {
      currentTurn = currentTurn === 'X' ? 'O' : 'X';
    }

    io.emit('gameState', { board, currentTurn, gameOver, winner });
  });

  socket.on('resetGame', () => {
  board = Array(9).fill(null);
  currentTurn = 'X';
  gameOver = false;
  io.emit('gameState', { board, currentTurn, gameOver, winner: null });
});

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`);
});