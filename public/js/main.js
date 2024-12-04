document.addEventListener("DOMContentLoaded", function () {
    const socket = io();

    // Reference the elements for the join form and game screen
    const joinForm = document.querySelector('#room-code-form');
    const readyUpScreen = document.querySelector('#ready-up-screen');
    const readyUpButton = document.querySelector('#ready-up-button');
    const gameScreen = document.querySelector('#game-screen');
    const gameStatus = document.querySelector('#game-status');

    // Check for existing session data
    const storedRoomCode = localStorage.getItem('roomCode');
    const storedNickname = localStorage.getItem('nickname');

    if (storedRoomCode && storedNickname) {
        // Attempt to reconnect automatically
        reconnectToRoom(storedRoomCode, storedNickname);
    }

    // Join button click handler
    document.querySelector('#join-game-button').addEventListener('click', function () {
        const roomCode = document.querySelector('#form-roomcode').value.toUpperCase();
        const nickname = document.querySelector('#form-name').value;

        // Save session data
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('nickname', nickname);

        // Attempt to join the room
        joinRoom(roomCode, nickname);
    });

    function joinRoom(roomCode, nickname) {
        // Emit room join request
        socket.emit('ROOM_JOIN_REQUEST', { roomCode, nickname });

        // Handle successful join
        socket.on('PLAYER_JOINED_ACK', (data) => {
            console.log(`Joined room: ${data.roomCode} as ${data.nickname}`);

            // Hide the join form and show the game screen
            joinForm.style.display = 'none';
            readyUpScreen.style.display = 'block';
        });

        // Handle errors
        socket.on('ERROR_NAME_TAKEN', () => {
            console.error('Nickname already taken.');
            alert('Nickname is already taken, please choose another one.');
            // Clear localStorage if joining fails
            localStorage.removeItem('roomCode');
            localStorage.removeItem('nickname');
        });

        socket.on('ERROR_INVALID_ROOM', () => {
            console.error('Invalid room code.');
            alert('Invalid room code. Please check and try again.');
            // Clear localStorage if joining fails
            localStorage.removeItem('roomCode');
            localStorage.removeItem('nickname');
        });
    }
    readyUpButton.addEventListener('click', () => {
        const roomCode = localStorage.getItem('roomCode');
        const nickName = localStorage.getItem('nickname');
        if (!roomCode || !nickName) {
            alert('Room code or nickname is missing!');
            return;
        }
        socket.emit('READY_TO_START', { roomCode, nickName });
        // Hide the ready-up screen and show the "Player is Ready" screen
        readyUpScreen.style.display = 'none';
        const playerReadyScreen = document.querySelector('#player-ready-screen');
        playerReadyScreen.classList.remove('hidden');
        playerReadyScreen.style.display = 'block';
    });

    function reconnectToRoom(roomCode, nickname) {
        console.log(`Reconnecting to room: ${roomCode} as ${nickname}`);
        joinRoom(roomCode, nickname);
    }
});
