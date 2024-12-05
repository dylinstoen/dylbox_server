const redis = require('redis-promisify');
const client = redis.createClient();

client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('error', (err) => {
    console.error('Redis error:', err);
});

module.exports = {
    // Create a new room
    createRoom: async (roomCode, unitySocketId) => {
        const roomData = JSON.stringify({ unitySocketId, players: [], state: 'waiting' });
        await client.setAsync(`room:${roomCode}`, roomData);
        console.log(`Room ${roomCode} created with Unity socket ID ${unitySocketId}`);
    },

    // Get room data
    getRoom: async (roomCode) => {
        const data = await client.getAsync(`room:${roomCode}`);
        return data ? JSON.parse(data) : null;
    },

    // Add player to a room
    addPlayerToRoom: async (roomCode, playerId, nickname) => {
        const room = await module.exports.getRoom(roomCode);
        if (!room) throw new Error('Room not found');

        room.players.push({ id: playerId, nickname, ready: false });
        await client.setAsync(`room:${roomCode}`, JSON.stringify(room));
    },

    // Remove player from all rooms
    removePlayerFromRooms: async (playerId) => {
        const keys = await client.keysAsync('room:*');
        for (const key of keys) {
            const room = await module.exports.getRoom(key.split(':')[1]);
            const index = room.players.findIndex(p => p.id === playerId);
            if (index !== -1) {
                room.players.splice(index, 1);
                await client.setAsync(key, JSON.stringify(room));
                return key.split(':')[1]; // Return the room code
            }
        }
        return null;
    },

    // Update a room
    updateRoom: async (roomCode, roomData) => {
        await client.setAsync(`room:${roomCode}`, JSON.stringify(roomData));
        console.log(`Room ${roomCode} updated`);
    },

    // Delete a room
    deleteRoom: async (roomCode) => {
        await client.delAsync(`room:${roomCode}`);
        console.log(`Room ${roomCode} deleted`);
    },
    deleteRooms: async (keys) => {
        try {
            const deletePromises = keys.map(key => client.delAsync(key));
            await Promise.all(deletePromises);
            console.log('Rooms cleared:', keys);
        } catch (err) {
            console.error('Failed to delete rooms:', err);
        }
    },
    // Get all room keys
    getRoomKeys: async () => {
        const keys = await client.keysAsync('room:*');
        console.log('Retrieved room keys:', keys);
        return keys;
    },

    // Disconnect Redis client
    disconnect: () => {
        client.quit();
        console.log('Disconnected from Redis');
    },
};
