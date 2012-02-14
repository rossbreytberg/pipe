window.onload = function() {
  var socket = io.connect('/')
  socket.on('userCountUpdate', function(data) {
    $('#userCount').text('Users Online: '+data['userCount'])
  })
}