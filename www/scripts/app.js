// Adds a custom rep method to the String prototype to replace all occurrences of a given substring with another string.
String.prototype.rep = function(find, replace) {
  return this.split(find).join(replace);
};
//Fixss function helps prevent XSS attacks
function fixss(input) {
  var inp = input;
  while (inp.indexOf('javascript:') != -1) {
    inp = inp.split('javascript:').join('');
  }
  inp = inp.rep('&', '&amp;').rep('<', '&lt;').rep('>', '&gt;').rep('"', '&quot');
  return inp;
}
//This function initializes the instance of MyChat class and calls the init medthod.
//Init fuction function that sets up the socket connection and event listener in a chat application. 
window.onload = function() {
  var mychat = new MyChat();
  mychat.init();
};
//Main class, which has a socket property for communication.
var MyChat = function() {
  this.socket = null;
};
//This object contains the methods and properties of the MyChat class.
MyChat.prototype = {
  //Method to sets up the socket connection and event listener.
  init: function() {
    var that = this;
    var ts = Date.now();
    this.socket = io.connect();
    //When socket is connected, it sets current room, displaya the name input field.
    this.socket.on('connect', function() {
      window.currentRoom = document.getElementById('chatRoom').value;
      document.getElementById('info').textContent = 'Wähle dein Name';
      document.getElementById('nickWrapper').style.display = 'block';
      document.getElementById('nicknameInput').focus();
    });
    //logs the time taken for the ping packet.
    this.socket.io.on('ping', function() {
      console.log('got ping packet in ' + Date.now() - ts + ' ms');
      ts = Date.now();
    });
    //if the chosen nickname already exists, it display a message asking the user to choose a different nickname
    this.socket.on('nickExisted', function() {
      console.log('user ' + fixss(document.getElementById('nicknameInput').value) + ' already exists');
      document.getElementById('info').textContent = 'Nickname ist vergeben, bitte einen anderen wählen';
    });
    //it update the document title, hides the login wrapper, and display a system message that the user has joined the chat room.
    this.socket.on('loginSuccess', function() {
      var xssuser = fixss(document.getElementById('nicknameInput').value);
      console.log('logged in as ' + xssuser);
      document.title = 'mychat | ' + xssuser;
      document.getElementById('loginWrapper').style.display = 'none';
      document.getElementById('messageInput').focus();
      that._displayNewMsg('system ', 'ist dem Chatraum beigetreten ' + document.getElementById('chatRoom').value, 'green');
    });
    //if there's an error, it display a connection error message.
    this.socket.on('error', function(err) {
      if (document.getElementById('loginWrapper').style.display == 'none') {
        document.getElementById('status').textContent = '!keine Verbindung möglich :(';
      } else {
        document.getElementById('info').textContent = '!keine Verbindung möglich :(';
      }
    });
    //When a system event occurs (e.g., user login/logout), it update the online users count and display a system message.
    this.socket.on('system', function(nickName, userCount, type) {
      var logtype = (type == 'login' ? ' ist beigetreten' : ' verlassen');
      var msg = nickName + logtype;
      that._displayNewMsg('system ', msg, 'green');
      document.getElementById('status').textContent = userCount + (userCount > 1 ? ' users' : ' Benutzer') + ' online';
      console.log('got system message: ' + msg);
    });
    //When a new message is received, it displays the message if it's in the current room.
    this.socket.on('newMsg', function(user, msg, color, room) {
      if (room == fixss(window.currentRoom)) {
        console.log('got message ' + msg + ' from user ' + user);
        that._displayNewMsg(user, msg, color);
      }
    });
    //When a new image is received, it display the image if it's in the current room. (not implement)
    this.socket.on('newImg', function(user, img, color, room) {
      if (room == fixss(window.currentRoom)) {
        console.log('got image data of length ' + img.length + ' from user ' + user);
        that._displayImage(user, img, color);
      }
    });

    //event listener for various buttons and inputs.
    //Trigger a login attempt when clicked.
    document.getElementById('loginBtn').addEventListener('click', function() {
      var nickName = document.getElementById('nicknameInput').value;
      //Checks if the name is empty or no.
      if (nickName.trim().length != 0) {
        that.socket.emit('login', nickName, document.getElementById('chatRoom').value);
        console.log('logging in as ' + fixss(nickName));
      } else {
        console.log('login nickname is empty');
        document.getElementById('nicknameInput').focus();
      };
    }, false);

    //Allows the user to join a new chat room when clicked.
    document.getElementById('roomBtn').addEventListener('click', function() {
      //set the variable to the value of the chat room input field.
      window.currentRoom = document.getElementById('chatRoom').value;
      //emits a 'joinRoom' event to the server with the chat room value
      that.socket.emit('joinRoom', window.currentRoom);
      console.log('joined chat room ' + document.getElementById('chatRoom').value);
    }, false);

    //Allow the user to log in by pressing the Enter key.
    document.getElementById('nicknameInput').addEventListener('keyup', function(e) {
      if (e.keyCode == 13) {
        var nickName = document.getElementById('nicknameInput').value;
        //It first checks if the nickname input field is not empty.
        if (nickName.trim().length != 0) {
          console.log('logging in as ' + fixss(nickName));
          that.socket.emit('login', nickName, document.getElementById('chatRoom').value);
        };
      };
    }, false);

    //Send a message when the send button is clicked
    document.getElementById('sendBtn').addEventListener('click', function() {
      var messageInput = document.getElementById('messageInput'),
        msg = messageInput.value,
        color = document.getElementById('colorStyle').value;
      messageInput.value = '';
      messageInput.focus();
      //It first checks if the nickname input field is not empty.
      if (msg.trim().length != 0) {
        // it emits a 'postMsg' event to the server with the message, color, and current room values. 
        that.socket.emit('postMsg', msg, color, window.currentRoom);
        //it displays the sent message in the chat history.
        that._displayNewMsg('me', fixss(msg), fixss(color));
        console.log('sent message ' + fixss(msg) + 'as user' + fixss(document.getElementById('nicknameInput').value));
        return;
      };
    }, false);

    //sends a message when the Enter key is pressed.
    document.getElementById('messageInput').addEventListener('keyup', function(e) {
      var messageInput = document.getElementById('messageInput'),
        msg = messageInput.value,
        color = document.getElementById('colorStyle').value;
        //It first checks if the message input field is not empty.
      if (e.keyCode == 13 && msg.trim().length != 0) {
        messageInput.value = '';
        // it emits a 'postMsg' event to the server with the message, color, and current room values.
        that.socket.emit('postMsg', msg, color, window.currentRoom);
        //it displays the sent message in the chat history.
        that._displayNewMsg('me', fixss(msg), fixss(color));
      };
    }, false);

    //clears the chat history when the clear button is clicked.
    document.getElementById('clearBtn').addEventListener('click', function() {
      //It sets the innerHTML of the 'historyMsg' element to an empty string.
      document.getElementById('historyMsg').innerHTML = '';
    }, false);

  },

  /*
    This methode display a new message in the chat history.
    it takes three arguments (user, msg, color)
  */
  _displayNewMsg: function(user, msg, color) {
    var container = document.getElementById('historyMsg'),
      //Create a new paragraph ele
      msgToDisplay = document.createElement('p'),
      date = new Date().toTimeString().substr(0, 8),
      msg = this._show(msg);
    msgToDisplay.style.color = color || '#000';
    msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
    container.appendChild(msgToDisplay);
    container.scrollTop = container.scrollHeight;
  },

  /*
    This method is similar to _displayNewMsg(), but it displays an image instead of a text message. 
    It takes three arguments: user, imgData, and color.
    Not implemented yet!
  */
  _displayImage: function(user, imgData, color) {
    var container = document.getElementById('historyMsg'),
      msgToDisplay = document.createElement('p'),
      date = new Date().toTimeString().substr(0, 8);
    msgToDisplay.style.color = color || '#000';
    msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '" target="_blank"><img src="' + imgData + '"/></a>';
    container.appendChild(msgToDisplay);
    container.scrollTop = container.scrollHeight;
  },

  /*
    takes a message as input and returns the message without any modifications.
  */
  _show: function(msg) {

    return msg;
  },
  
};
