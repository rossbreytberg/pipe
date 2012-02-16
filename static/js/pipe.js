window.onload = function() {
    var room = $('#room').val()
    var user = $('#user').val()
    var userId = 0
    history.replaceState({}, "Pipe", "/"+room+"?user="+user)
    var socket = io.connect('/pipe')
    var sharedFiles = $('#sharedFiles').get(0).files

    $('#chatInputForm').submit(function() {
        socket.emit('chatMessage', {message:$('#chatInput').val()})
        $('#chatInput').get(0).value = ''
    })

    $('#sharedFiles').get(0).addEventListener('change', sharedFilesUpdate, false)

    function fileAdd(file, user, userId) {
        var newFile = $('<div>', {class:'fileListItem'})
        newFile.text(file.name+", "+file.type+", "+file.size+", shared by "+user)
        newFile.get(0).onclick = function() {
            downloadRequest(file, userId)
        }
        $('#fileListContainer').append(newFile)
    }

    function userAdd(user) {
        var newUser = $('<div>')
        newUser.text(user)
        $('#userListText').append(newUser)
    }

    function newChatMessage(user, message) {
        var newMessage = $('<div>')
        newMessage.text(user+': '+message)
        var updateScroll = true
        if ($('#chatText')[0].scrollHeight > $('#chatText').scrollTop() + 319) {
            updateScroll = false
        }
        $('#chatText').append(newMessage)
        if (updateScroll) {
            $('#chatText').scrollTop($('#chatText')[0].scrollHeight)
        }
    }

    function sharedFilesUpdate() {
        sharedFiles = $('#sharedFiles').get(0).files
        $('#filename').text('Name: '+sharedFiles[0].name)
        $('#filetype').text('Type: '+sharedFiles[0].type)
        $('#filesize').text('Size: '+sharedFiles[0].size)
        socket.emit('refreshFileListRequest', {})
    }

    function downloadRequest(file, fileOwner) {
        var id = btoa(file.name+file.type+file.size+room+fileOwner+userId)
        if (document.getElementById('download'+id) == null) {
            socket.emit('downloadRequest', {file:file, id:id})
            var downloadFrame = $('<iframe>', {id:'download'+id, name:'download'+id, class:'pipe'})
            $('#container').append(downloadFrame)
            downloadFrame.load(function() {
                downloadFrame.remove()
            })
            downloadFrame.attr('id', 'download'+id)
            downloadFrame.attr('src', '/download/'+id+'?filename='+file.name+'&filetype='+file.type+'&room='+room+'&uploader='+fileOwner+'&downloader='+userId)
        } else {
            alert('You are already downloading this!')
        }
    }

    socket.on('connect', function() {
        socket.emit('setRoomAndUser', {room:room, user:user})
        $('#statusDisplay').text("Status: Connected")
    })

    socket.on('disconnect', function() {
        $('#statusDisplay').text("Status: Disconnected")
    })

    socket.on('userIdAssign', function(data) {
        userId = data['userId']
    })

    socket.on('filesAdded', function(data) {
        for (var i = 0; i < data['files'].length; i++) {
            fileAdd(data['files'][i], data['user'], data['userId'])
        }
    })

    socket.on('userAdded', function(data) {
        userAdd(data['user'])
    })

    socket.on('refreshFileList', function(data) {
        $('#fileListContainer').empty()
        socket.emit('fileListUpdate', {files:sharedFiles})
    })

    socket.on('refreshUserList', function(data) {
        $('#userListText').empty()
        socket.emit('userListUpdate', {}) // data is blank because username is already stored in socket
    })

    socket.on('chatMessage', function(data) {
        newChatMessage(data['user'], data['message'])
    })

    socket.on('uploadRequest', function(data) {
        for (var i = 0; i < sharedFiles.length; i++) {
            var file = sharedFiles[i]
            if (btoa(file.name+file.type+file.size+room+userId+data['requester']) == data['id']) {
                var uploadFrame = $('<iframe>', {id:'upload'+data['id'], name:'upload'+data['id'], class:'pipe'})
                $('#container').append(uploadFrame)
                uploadFrame.load(function() {
                    uploadFrame.remove()
                })
                $('#uploadForm').attr('target', 'upload'+data['id'])
                $('#uploadForm').attr('action', '/upload/'+data['id'])
                $('#uploadForm').get(0).submit()
            }
        }
    })

}