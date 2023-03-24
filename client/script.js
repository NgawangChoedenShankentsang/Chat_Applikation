const socket = new WebSocket('ws://localhost:3000');

// Handle connection opened
socket.addEventListener('open', (event) => {
  console.log('WebSocket connection opened');
});

// Handle connection closed
socket.addEventListener('close', (event) => {
  console.log('WebSocket connection closed');
});

// Handle messages received from server
socket.addEventListener('message', (event) => {
  const message = event.data;
  // Add message to chat display
});

// Handle send button click event
const sendBtn = document.querySelector('.message-input button');
const messageInput = document.querySelector('.message-input input[type="text"]');

sendBtn.addEventListener('click', () => {
  const message = messageInput.value;
  socket.send(message);
  // Add message to chat display
});

