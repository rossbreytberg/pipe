window.onload = function() {
  var room = $('#room').val()
  var user = $('#user').val()
  history.replaceState({}, "Pipe", "/"+room+"?user="+user)
  var socket = io.connect('/pipe')
  var sharedFiles = $('#sharedFiles').get(0).files

  $('#sharedFiles').get(0).addEventListener('change', sharedFilesUpdate, false)

  function fileAdd(file, user) {
    var newFile = $('<div>')
    newFile.text(file.name+", "+file.type+", "+file.size+", shared by "+user)
    newFile.attr('class', 'fileListItem')
    newFile.attr('file', file)
    newFile.get(0).onclick = function() {
      downloadRequest(file)
    }
    $('#filesListContainer').append(newFile)
  }

  function fileRemove(file, user) {
    var files = $('#filesListContainer').children()
    for (var i = 0; i < files.length; i++) {
      if ($(files[i]).text() == file.name+", "+file.type+", "+file.size+", shared by "+user) {
        $(files[i]).remove()
      }
    }
  }

  function sharedFilesUpdate() {
    sharedFiles = $('#sharedFiles').get(0).files
    $('#filename').text('Name: '+sharedFiles[0].name)
    $('#filetype').text('Type: '+sharedFiles[0].type)
    $('#filesize').text('Size: '+sharedFiles[0].size)
    socket.emit('refreshFilesListRequest', {})
  }

  function downloadRequest(file) {
    socket.emit('downloadRequest', {file:file, id:btoa(file.name+file.type+file.size)})
  }

  socket.on('connect', function() {
    socket.emit('setRoomAndUser', {room:room, user:user})
    $('#status').text("Status: Connected")
  })

  socket.on('disconnect', function() {
    $('#status').text("Status: Disconnected")
  })

  socket.on('filesAdded', function(data) {
    for (var i = 0; i < data['files'].length; i++) {
      fileAdd(data['files'][i], data['user'])
    }
  })

  socket.on('refreshFilesList', function(data) {
    $('#filesListContainer').empty()
    socket.emit('filesListUpdate', {files:sharedFiles})
  })

  socket.on('uploadRequest', function(data) {
    for (var i = 0; i < sharedFiles.length; i++) {
      var file = sharedFiles[i]
      if (btoa(file.name+file.type+file.size) == data['id']) {
        $('#uploadForm').attr('action', '/upload/'+data['id'])
        $('#uploadForm').get(0).submit()
        $('#uploadForm').attr('files', sharedFiles)
        $('#uploadForm').attr('action', '')
      }
    }
  })

  socket.on('beginDownload', function(data) {
    $('#pipe').attr('src', '/download/'+data['id']+'?filename='+data['name'])
  })

}