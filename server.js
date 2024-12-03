const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const rooms = {}; // Store room details, keyed by room code

// Serve static files for the web client
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Unity creates a room
    socket.on('CREATE_ROOM', () => {
        const roomCode = generateRandomString(4).toUpperCase();
        rooms[roomCode] = { unitySocketId: socket.id, players: [] };
        console.log(`Room created: ${roomCode} by Unity instance ${socket.id}`);
        socket.emit('ROOM_CREATED', { roomCode });
    });

    // Web client requests to join a room
    socket.on('ROOM_JOIN_REQUEST', ({ roomCode, nickname }) => {
        const room = rooms[roomCode];
        if (!room) {
            socket.emit('ERROR_INVALID_ROOM');
            return;
        }

        // Check for duplicate nickname
        const isNameTaken = room.players.some(player => player.nickname === nickname);
        if (isNameTaken) {
            socket.emit('ERROR_NAME_TAKEN');
            return;
        }

        // Add player to the room
        room.players.push({ id: socket.id, nickname });
        console.log(`${nickname} joined room ${roomCode}`);

        // Notify Unity client associated with the room
        io.to(room.unitySocketId).emit('PLAYER_JOINED', { nickname });

        // Acknowledge the web client
        socket.emit('PLAYER_JOINED_ACK', { roomCode, nickname });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        // If the disconnecting client is a Unity instance, clean up the room
        for (const roomCode in rooms) {
            if (rooms[roomCode].unitySocketId === socket.id) {
                console.log(`Unity instance ${socket.id} disconnected, deleting room ${roomCode}`);
                delete rooms[roomCode];
                return;
            }

            // If the disconnecting client is a web client, remove them from the room
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(player => player.id === socket.id);
            if (playerIndex !== -1) {
                const [player] = room.players.splice(playerIndex, 1);
                console.log(`Player ${player.nickname} left room ${roomCode}`);
                io.to(room.unitySocketId).emit('PLAYER_LEFT', { nickname: player.nickname });
                break;
            }
        }
    });
});

httpServer.listen(3003, () => {
    console.log('Server running on http://localhost:3003');
});

function generateRandomString(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
