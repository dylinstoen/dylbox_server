const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const redisClient = require('./redisClient'); // Redis utilities
const db = require('./db');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);





// Serve static files for the web client
app.use(express.static('public'));

async function clearRooms() {
    try {
        const keys = await redisClient.getRoomKeys(); // Get all room keys
        if (keys.length > 0) {
            await redisClient.deleteRooms(keys); // Delete all keys
            console.log(`Cleared ${keys.length} room(s) from Redis`);
        } else {
            console.log('No rooms to clear');
        }
    } catch (err) {
        console.error('Failed to clear rooms:', err);
    }
}

// Call this function when the server starts
clearRooms();

io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Unity creates a room
    socket.on('CREATE_ROOM', async () => {
        const roomCode = generateRandomString(4).toUpperCase();
        await redisClient.createRoom(roomCode, socket.id); // Store Unity socket ID
        socket.emit('ROOM_CREATED', { roomCode });
        console.log(`Room created: ${roomCode} by Unity instance ${socket.id}`);
    });

    // Handle Ready to Start
    socket.on('READY_TO_START', async ({ roomCode, nickName }) => {
        const room = await redisClient.getRoom(roomCode);
        if (!room) {
            console.error(`Room ${roomCode} does not exist`);
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.ready = true;
            await redisClient.updateRoom(roomCode, room);
            console.log(`Player ${socket.id} is ready`);

            // Check if all players are ready
            const allReady = room.players.every(p => p.ready);
            if (allReady) {
                console.log('All players are ready. Starting the game...');
                await db.saveMatchStart(roomCode);
                io.to(room.unitySocketId).emit('ALL_READY'); // Notify Unity
            }
        }
    });

    // Web client requests to join a room
    socket.on('ROOM_JOIN_REQUEST', async ({ roomCode, nickname }) => {
        const room = await redisClient.getRoom(roomCode);
        if (!room) {
            socket.emit('ERROR_INVALID_ROOM');
            return;
        }

        if (room.players.length >= 6) {
            socket.emit('ERROR_ROOM_FULL');
            return;
        }

        const existingPlayer = room.players.find(player => player.id === socket.id);
        if (existingPlayer) {
            existingPlayer.id = socket.id; // Update socket ID for reconnect
            socket.join(roomCode);
            console.log(`${nickname} reconnected to room ${roomCode}`);
            io.to(room.unitySocketId).emit('PLAYER_RECONNECTED', { nickname });
            socket.emit('PLAYER_JOINED_ACK', { roomCode, nickname });
        } else {
            const isNameTaken = room.players.some(player => player.nickname === nickname);
            if (isNameTaken) {
                socket.emit('ERROR_NAME_TAKEN');
                return;
            }

            room.players.push({ id: socket.id, nickname });
            await redisClient.updateRoom(roomCode, room);
            socket.join(roomCode);
            console.log(`${nickname} joined room ${roomCode} where the unity id is ${room.unitySocketId}`);
            io.to(room.unitySocketId).emit('PLAYER_JOINED', { nickname });
            socket.emit('PLAYER_JOINED_ACK', { roomCode, nickname });
        }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);

        const roomKeys = await redisClient.getRoomKeys();
        for (const key of roomKeys) {
            const roomCode = key.split(':')[1];
            const room = await redisClient.getRoom(roomCode);

            // Check if the disconnected client is the Unity instance
            if (room.unitySocketId === socket.id) {
                console.log(`Unity instance ${socket.id} disconnected, deleting room ${roomCode}`);
                await redisClient.deleteRoom(roomCode);
                return;
            }

            // Check if the disconnected client is a player
            const playerIndex = room.players.findIndex(player => player.id === socket.id);
            if (playerIndex !== -1) {
                const [player] = room.players.splice(playerIndex, 1);
                await redisClient.updateRoom(roomCode, room);
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
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
