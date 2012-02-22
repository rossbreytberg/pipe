window.onload = function() {
    var room = $('#room').val()
    var user = $('#user').val()
    var userId = 0
    history.replaceState({}, "Pipe", "/"+room+"?user="+user)
    var socket = io.connect('/pipe')
    var sharedFiles = []

    $('#chatInput').attr('name', new Date().getTime())

    $('#chatInputForm').submit(function() {
        var message = $('#chatInput').val()
        if (message != '') {
            socket.emit('chatMessage', {message:$('#chatInput').val()})
            $('#chatInput').get(0).value = ''
        }
    })

    $('#sharedFile').get(0).addEventListener('change', function() {sharedFileUpdate($('#sharedFile'), $('#filename'), $('#filetype'), $('#filesize'))}, false)

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
        var newMessage = $('<div>', {class:'chatMessage'})
        var chatMessageUser = $('<div>', {class:'chatMessageUser'})
        chatMessageUser.text(user+': ')
        var chatMessageText = $('<div>', {class:'chatMessageText'})
        chatMessageText.text(message)
        newMessage.append(chatMessageUser)
        newMessage.append(chatMessageText)
        var updateScroll = true
        if ($('#chatText')[0].scrollHeight > $('#chatText').scrollTop() + 319) {
            updateScroll = false
        }
        $('#chatText').append(newMessage)
        if (updateScroll) {
            $('#chatText').scrollTop($('#chatText')[0].scrollHeight)
        }
    }

    function sharedFileUpdate(sharedFile, fileNameDesc, fileTypeDesc, fileSizeDesc) {
        sharedFiles = []
        var sharedFileList = $('.sharedFile')
        for (var i = 0; i < sharedFileList.size(); i++) {
            var file = sharedFileList.get(i).files[0]
            if (file != null) {
                sharedFiles.push(file)
            }
        }
        fileNameDesc.text(sharedFile.get(0).files[0].name)
        fileTypeDesc.text(sharedFile.get(0).files[0].type)
        fileSizeDesc.text(sharedFile.get(0).files[0].size+' bytes')
        var form = sharedFile.parent()
        sharedFile.css({visibility:'hidden', width:'0px', height:'0px'})
        var removeButton = $('<input>', {class:'removeButton', type:'button', value:'Remove'})
        removeButton.get(0).onclick = function() {
            form.parent().remove()
            sharedFiles = []
            var sharedFileList = $('.sharedFile')
            for (var i = 0; i < sharedFileList.size(); i++) {
                var file = sharedFileList.get(i).files[0]
                if (file != null) {
                    sharedFiles.push(file)
                }
            }
            socket.emit('refreshFileListRequest', {})
        }
        form.append(removeButton)
        var children = $('#fileListingContainer').children()
        if ($(children[children.size()-1]).children()[0] == fileNameDesc.get(0)) {
            var newFileListing = $('<div>', {class:'fileListing'})
            var newFileNameDesc = $('<div>', {class:'fileNameDescriptor'})
            var newFileTypeDesc = $('<div>', {class:'fileTypeDescriptor'})
            newFileTypeDesc.text('No file selected.')
            var newFileSizeDesc = $('<div>', {class:'fileSizeDescriptor'})
            newFileListing.append(newFileNameDesc)
            newFileListing.append(newFileTypeDesc)
            newFileListing.append(newFileSizeDesc)
            var newUploadForm = $('<form>', {class:'uploadForm', enctype:'multipart/form-data', method:'POST'})
            var newFileInput = $('<input>', {class:'sharedFile', type:'file', name:'file'})
            newUploadForm.append(newFileInput)
            newFileListing.append(newUploadForm)
            newFileListing.get(0).addEventListener('change', function() {sharedFileUpdate(newFileInput, newFileNameDesc, newFileTypeDesc, newFileSizeDesc)}, false)
            $('#fileListingContainer').append(newFileListing)
        }
        socket.emit('refreshFileListRequest', {})
    }

    function downloadRequest(file, fileOwner) {
        var id = btoa(escape(file.name)+escape(file.type)+file.size+escape(room)+fileOwner+userId)
        if (document.getElementById('download'+id) == null) {
            var downloadFrame = $('<iframe>', {id:'download'+id, name:'download'+id, class:'pipe'})
            $('#container').append(downloadFrame)
            downloadFrame.load(function() {
                downloadFrame.remove()
            })
            downloadFrame.attr('id', 'download'+id)
            downloadFrame.attr('src', '/download/'+id+'?filename='+file.name+'&filetype='+file.type+'&size='+file.size+'&room='+room+'&uploader='+fileOwner+'&downloader='+userId)
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
        console.log(data['files'])
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
            if (btoa(escape(file.name)+escape(file.type)+file.size+room+userId+data['requester']) == data['id']) {
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