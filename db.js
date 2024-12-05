const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'dylbox',
    password: '5064204032',
    port: 5432,
});

module.exports = {
    // Save match start
    saveMatchStart: async (roomCode) => {
        try {
            await pool.query('INSERT INTO match_history (room_code) VALUES ($1)', [roomCode]);
            console.log(`Match started for room ${roomCode}`);
        } catch (err) {
            console.error('Failed to save match start:', err);
        }
    },

    // Create player profile
    createPlayerProfile: async (playerId, nickname) => {
        try {
            await pool.query('INSERT INTO players (id, nickname) VALUES ($1, $2)', [playerId, nickname]);
            console.log(`Player profile created for ${nickname}`);
        } catch (err) {
            console.error('Failed to create player profile:', err);
        }
    },
};
