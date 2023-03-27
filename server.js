// Import the necessary modules and libraries.
var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  { Server } = require('socket.io'),
  users = [];

// Create a new instance of the socket.io server.
var io = new Server(server, {
  // Set the path for socket.io
  path: "/socket.io/",
  // Set the ping timeout and interval
  pingTimeout: 60000,
  pingInterval: 10000,
});

// Add a prototype method to the String Class to replace all occurrences of a String
String.prototype.rep = function(find, replace) {
  return this.split(find).join(replace);
};

// Function to sanitize user input to prevent XSS attacks
function fixss(input) {
  if (input != null || input != undefined || typeof input != 'undefined') {
    var inp = input;
    // Remove any instances of Javascript:.
    while (inp.indexOf('javascript:') != -1) {
      inp = inp.split('javascript:').join('');
    }
    // Replace special characters with their HTML entity equivalent.
    inp = inp.rep('&', '&amp;').rep('<', '&lt;').rep('>', '&gt;').rep('"', '&quot');
    return inp;
  } else {
    return null;
  }
}

// Serve the files in the WWW dir
app.use('/', express.static(__dirname + '/www'));
// Bind the server to the specified port, or 3000 if no port is specified.
var listenport = process.env.PORT || 3000;
server.listen(listenport);
// Log the server start message
console.log('Server started on port' + listenport + '\nGo to http://127.0.0.1:' + listenport + '/ to view locally\n');
// Import the DB module
const pool = require('./database');
// setup the messages table in the DB
(async function setupDatabase() {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        color VARCHAR(7) NOT NULL,
        room VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );
    console.log('Messages table created or already exists.');
  } catch (error) {
    console.error('Error creating messages table:', error);
  }
})();

//handle the socket events
io.sockets.on('connection', function(socket) {
  // Events for new user login
  socket.on('login', function(nickname, chatroom) {
    // Check if the name is already in use
    if (users.indexOf(nickname) > -1 && nickname.toLowerCase() != 'system') {
      console.log('A user tried to join with existing nickname ' + fixss(nickname));
      // Emit a 'nickExisted' event to the user
      socket.emit('nickExisted');
    } else {
      // Store the user's name and chatroom
      socket.room = chatroom;
      var nick = fixss(nickname);
      socket.nickname = nick;
      // Add the user to the list of users
      users.push(nick);
      // Emit a loginSucces event to the user
      socket.emit('loginSuccess');
      // Emit a system event to all users to announce the new user
      io.sockets.emit('system', nick, users.length, 'login');
      console.log('User ' + nick + ' joined');
    };
  });

  // Event for when a user disconnects
  socket.on('disconnect', function() {
    if (socket.nickname != null) {
      //users.splice(socket.userIndex, 1);
      console.log('user ' + socket.nickname + ' disconnected');
      // Remove the user from list of users
      users.splice(users.indexOf(socket.nickname), 1);
      // Emit a system event to all users to announce the user's logout
      socket.broadcast.emit('system', socket.nickname, users.length, 'logout');
    }
  });

  // Event for when a user joins a room
  socket.on('joinRoom', function(chatroom) {
    // Store the user's current room
    socket.room = chatroom;
  });

  // Event for when a user post a message
  socket.on('postMsg', async function(msg, color, room) {
    // Checkt if the room is a valid string 
    if (room != null && typeof room == 'string') {
      // Check if the room matches the user's current room
      if (fixss(room) === socket.room) {
        console.log('got message from ' + socket.nickname + ' with content: ' + fixss(msg) + ' in room: ' + room);
        // Emit a newMsg event to all users to announce the new message
        socket.broadcast.emit('newMsg', socket.nickname, fixss(msg), fixss(color), fixss(room));
  
        // Store message in the database
        try {
          await pool.query(
            'INSERT INTO messages (user, message, color, room) VALUES (?, ?, ?, ?)',
            [socket.nickname, fixss(msg), fixss(color), fixss(room)]
          );
        } catch (error) {
          console.error('Error inserting message into the database:', error);
        }
      }
    }
  });
  
  // Event for when a user posts an image ( not implemented yet!)
  socket.on('img', function(imgData, color, room) {
    // Check if the room is a valid string
    if (room != null && typeof room == 'string') {
      console.log('got image from ' + socket.nickname + ' with data size of ' + imgData.length + ' bytes');
      // Emit a newImg event to all users to announce the new image
      socket.broadcast.emit('newImg', socket.nickname, fixss(imgData), fixss(color), fixss(room));
    }
  });
});
