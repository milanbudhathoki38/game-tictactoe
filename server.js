const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);

  socket.on('move', (data) => {
    socket.broadcast.emit('move', data);
  });

  socket.on('disconnect', () => {
    console.log('A player disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`);
});