var socket = io.connect('/')
window.onload = function() {
  document.getElementById('fileToUpload').addEventListener('change', prepareUpload, false)
  var roomid = document.getElementById('roomid').childNodes[0].nodeValue
  socket.on('connect', function() {
    socket.emit('connected', {roomid:roomid})
    document.getElementById('status').childNodes[0].nodeValue = "Status: Connected"
  })
  socket.on('disconnect', function() {
    document.getElementById('status').childNodes[0].nodeValue = "Status: Disconnected"
  })
  socket.on('download', function(data) {
    document.getElementById('filename').childNodes[0].nodeValue = "File Name: "+data['filename']
    document.getElementById('pipe').setAttribute('src','/download/'+roomid)
  })
}


function prepareUpload() {
  socket.emit('upload', {filename:document.getElementById('fileToUpload').files[0].name})
}



