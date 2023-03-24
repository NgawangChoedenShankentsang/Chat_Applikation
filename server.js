var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  { Server } = require('socket.io'),
  users = [];
var io = new Server(server, {
  path: "/socket.io/",
  pingTimeout: 60000,
  pingInterval: 10000,
});
String.prototype.rep = function(find, replace) {
  return this.split(find).join(replace);
};
function fixss(input) {
  if (input != null || input != undefined || typeof input != 'undefined') {
    var inp = input;
    while (inp.indexOf('javascript:') != -1) {
      inp = inp.split('javascript:').join('');
    }
    inp = inp.rep('&', '&amp;').rep('<', '&lt;').rep('>', '&gt;').rep('"', '&quot');
    return inp;
  } else {
    return null;
  }
}
app.use('/', express.static(__dirname + '/www'));
//bind the server to the 80 port
//server.listen(3000);//for local test
var listenport = process.env.PORT || 3000;
server.listen(listenport);
console.log('Server started on port' + listenport + '\nGo to http://127.0.0.1:' + listenport + '/ to view locally\n');

const pool = require('./database');
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

//handle the socket
io.sockets.on('connection', function(socket) {
  //new user login
  socket.on('login', function(nickname, chatroom) {
    if (users.indexOf(nickname) > -1 && nickname.toLowerCase() != 'system') {
      console.log('A user tried to join with existing nickname ' + fixss(nickname));
      socket.emit('nickExisted');
    } else {
      //socket.userIndex = users.length;
      socket.room = chatroom;
      var nick = fixss(nickname);
      socket.nickname = nick;
      users.push(nick);
      socket.emit('loginSuccess');
      io.sockets.emit('system', nick, users.length, 'login');
      console.log('User ' + nick + ' joined');
    };
  });
  //user leaves
  socket.on('disconnect', function() {
    if (socket.nickname != null) {
      //users.splice(socket.userIndex, 1);
      console.log('user ' + socket.nickname + ' disconnected');
      users.splice(users.indexOf(socket.nickname), 1);
      socket.broadcast.emit('system', socket.nickname, users.length, 'logout');
    }
  });
  socket.on('joinRoom', function(chatroom) {
    socket.room = chatroom;
  });
  //new message get
  socket.on('postMsg', async function(msg, color, room) {
    if (room != null && typeof room == 'string') {
      if (fixss(room) === socket.room) {
        console.log('got message from ' + socket.nickname + ' with content: ' + fixss(msg) + ' in room: ' + room);
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
  
  //new image get
  socket.on('img', function(imgData, color, room) {
    if (room != null && typeof room == 'string') {
      console.log('got image from ' + socket.nickname + ' with data size of ' + imgData.length + ' bytes');
      socket.broadcast.emit('newImg', socket.nickname, fixss(imgData), fixss(color), fixss(room));
    }
  });
});
