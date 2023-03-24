String.prototype.rep = function(find, replace) {
  return this.split(find).join(replace);
};
function fixss(input) {
  var inp = input;
  while (inp.indexOf('javascript:') != -1) {
    inp = inp.split('javascript:').join('');
  }
  inp = inp.rep('&', '&amp;').rep('<', '&lt;').rep('>', '&gt;').rep('"', '&quot');
  return inp;
}
window.onload = function() {
  var mychat = new MyChat();
  mychat.init();
};
var MyChat = function() {
  this.socket = null;
};
MyChat.prototype = {
  init: function() {
    var that = this;
    var ts = Date.now();
    this.socket = io.connect();
    this.socket.on('connect', function() {
      window.currentRoom = document.getElementById('chatRoom').value;
      document.getElementById('info').textContent = 'Wähle dein Name';
      document.getElementById('nickWrapper').style.display = 'block';
      document.getElementById('nicknameInput').focus();
    });
    this.socket.io.on('ping', function() {
      console.log('got ping packet in ' + Date.now() - ts + ' ms');
      ts = Date.now();
    });
    this.socket.on('nickExisted', function() {
      console.log('user ' + fixss(document.getElementById('nicknameInput').value) + ' already exists');
      document.getElementById('info').textContent = 'Nickname ist vergeben, bitte einen anderen wählen';
    });
    this.socket.on('loginSuccess', function() {
      var xssuser = fixss(document.getElementById('nicknameInput').value);
      console.log('logged in as ' + xssuser);
      document.title = 'mychat | ' + xssuser;
      document.getElementById('loginWrapper').style.display = 'none';
      document.getElementById('messageInput').focus();
      that._displayNewMsg('system ', 'ist dem Chatraum beigetreten ' + document.getElementById('chatRoom').value, 'green');
    });
    this.socket.on('error', function(err) {
      if (document.getElementById('loginWrapper').style.display == 'none') {
        document.getElementById('status').textContent = '!keine Verbindung möglich :(';
      } else {
        document.getElementById('info').textContent = '!keine Verbindung möglich :(';
      }
    });
    this.socket.on('system', function(nickName, userCount, type) {
      var logtype = (type == 'login' ? ' ist beigetreten' : ' verlassen');
      var msg = nickName + logtype;
      that._displayNewMsg('system ', msg, 'green');
      document.getElementById('status').textContent = userCount + (userCount > 1 ? ' users' : ' Benutzer') + ' online';
      console.log('got system message: ' + msg);
    });
    this.socket.on('newMsg', function(user, msg, color, room) {
      if (room == fixss(window.currentRoom)) {
        console.log('got message ' + msg + ' from user ' + user);
        that._displayNewMsg(user, msg, color);
      }
    });
    this.socket.on('newImg', function(user, img, color, room) {
      if (room == fixss(window.currentRoom)) {
        console.log('got image data of length ' + img.length + ' from user ' + user);
        that._displayImage(user, img, color);
      }
    });
    document.getElementById('loginBtn').addEventListener('click', function() {
      var nickName = document.getElementById('nicknameInput').value;
      if (nickName.trim().length != 0) {
        that.socket.emit('login', nickName, document.getElementById('chatRoom').value);
        console.log('logging in as ' + fixss(nickName));
      } else {
        console.log('login nickname is empty');
        document.getElementById('nicknameInput').focus();
      };
    }, false);
    document.getElementById('roomBtn').addEventListener('click', function() {
      window.currentRoom = document.getElementById('chatRoom').value;
      that.socket.emit('joinRoom', window.currentRoom);
      console.log('joined chat room ' + document.getElementById('chatRoom').value);
    }, false);
    document.getElementById('nicknameInput').addEventListener('keyup', function(e) {
      if (e.keyCode == 13) {
        var nickName = document.getElementById('nicknameInput').value;
        if (nickName.trim().length != 0) {
          console.log('logging in as ' + fixss(nickName));
          that.socket.emit('login', nickName, document.getElementById('chatRoom').value);
        };
      };
    }, false);
    document.getElementById('sendBtn').addEventListener('click', function() {
      var messageInput = document.getElementById('messageInput'),
        msg = messageInput.value,
        color = document.getElementById('colorStyle').value;
      messageInput.value = '';
      messageInput.focus();
      if (msg.trim().length != 0) {
        that.socket.emit('postMsg', msg, color, window.currentRoom);
        that._displayNewMsg('me', fixss(msg), fixss(color));
        console.log('sent message ' + fixss(msg) + 'as user' + fixss(document.getElementById('nicknameInput').value));
        return;
      };
    }, false);
    document.getElementById('messageInput').addEventListener('keyup', function(e) {
      var messageInput = document.getElementById('messageInput'),
        msg = messageInput.value,
        color = document.getElementById('colorStyle').value;
      if (e.keyCode == 13 && msg.trim().length != 0) {
        messageInput.value = '';
        that.socket.emit('postMsg', msg, color, window.currentRoom);
        that._displayNewMsg('me', fixss(msg), fixss(color));
      };
    }, false);
    document.getElementById('clearBtn').addEventListener('click', function() {
      document.getElementById('historyMsg').innerHTML = '';
    }, false);

  },
  _displayNewMsg: function(user, msg, color) {
    var container = document.getElementById('historyMsg'),
      msgToDisplay = document.createElement('p'),
      date = new Date().toTimeString().substr(0, 8),
      //determine whether the msg contains emoji
      msg = this._show(msg);
    msgToDisplay.style.color = color || '#000';
    msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
    container.appendChild(msgToDisplay);
    container.scrollTop = container.scrollHeight;
  },
  _displayImage: function(user, imgData, color) {
    var container = document.getElementById('historyMsg'),
      msgToDisplay = document.createElement('p'),
      date = new Date().toTimeString().substr(0, 8);
    msgToDisplay.style.color = color || '#000';
    msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '" target="_blank"><img src="' + imgData + '"/></a>';
    container.appendChild(msgToDisplay);
    container.scrollTop = container.scrollHeight;
  },
  _show: function(msg) {

    return msg;
  },
  
};
