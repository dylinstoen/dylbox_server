document.addEventListener("DOMContentLoaded", function () {
    const socket = io();

    // Reference the elements for the join form and game screen
    const joinForm = document.querySelector('#room-code-form'); // Fixed ID reference
    const gameScreen = document.querySelector('#game-screen');
    const gameStatus = document.querySelector('#game-status');

    // Join button click handler
    document.querySelector('#join-game-button').addEventListener('click', function () {
        const roomCode = document.querySelector('#form-roomcode').value.toUpperCase();
        const nickname = document.querySelector('#form-name').value;

        // Emit room join request
        socket.emit('ROOM_JOIN_REQUEST', { roomCode, nickname });

        // Handle successful join
        socket.on('PLAYER_JOINED_ACK', (data) => {
            console.log(`Joined room: ${data.roomCode} as ${data.nickname}`);

            // Hide the join form and show the game screen
            joinForm.style.display = 'none';
            gameScreen.style.display = 'block';
            // Update the game screen status
            gameStatus.textContent = `Connected to room: ${data.roomCode} as ${data.nickname}`;
        });

        // Handle errors
        socket.on('ERROR_NAME_TAKEN', () => {
            console.error('Nickname already taken.');
            alert('Nickname is already taken, please choose another one.');
        });

        socket.on('ERROR_INVALID_ROOM', () => {
            console.error('Invalid room code.');
            alert('Invalid room code. Please check and try again.');
        });
    });
});
