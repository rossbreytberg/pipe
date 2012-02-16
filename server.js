var express = require('express')
var formidable = require('formidable')
var io = require('socket.io')

var server = express.createServer()
server.set('view engine', 'ejs')
server.set('view options', {
    layout: false
})
server.set('views', __dirname + "/views")
server.use("/static", express.static(__dirname + "/static"))
server.listen(80)

var io = io.listen(server)
io.set('log level', 1)

var responses = {}

server.get('/', function(req, res) {
    if (!req.query.room) {
        res.render('index', {userCount:userCount})
    } else {
    var user = ''
        if (req.query.user) {
            user = req.query.user
        } else {
            user = 'Anonymous'
        }
        res.render('pipe', {room:req.query.room, user:user})
    }
})

server.get('/:room', function(req, res) {
    var user
    if (req.query.user) {
        user = req.query.user
    } else {
        user = 'Anonymous'
    }
    res.render('pipe', {room:req.params.room, user:user})
})

server.get('/download/:id', function(req, res) {
    console.log('downloading: '+req.query.filename)
    console.log(responses)
    console.log(responses[req.params.id])
    console.log('download info end')
    if (responses[req.params.id] == null) {
        responses[req.params.id] = [res]
    } else {
        responses[req.params.id].push(res)
    }
    res.writeHead(200, {'connection':'keep-alive', 'content-disposition':'attachment;filename='+req.query.filename, 'content-type':'application/octet-stream'})
})

server.post('/upload/:id', function(req, res) {
    console.log('upload info')
    console.log(responses)
    console.log(responses[req.params.id])
    console.log('upload info end')
    if (responses[req.params.id] != null) {
        var form = new formidable.IncomingForm();
            form.parse(req)
            form.onPart = function(part) {
                part.on('data', function(data) {
                    for (var i = 0; i < responses[req.params.id].length; i++) {
                        responses[req.params.id][i].write(data)
                    }
                })
                part.on('end', function() {
                    for (var i = 0; i < responses[req.params.id].length; i++) {
                        responses[req.params.id][i].end()
                    }
                    delete responses[req.params.id]
                    res.write("File sent.")
                    res.end()
                })
            }
    } else {
        console.log('Upload failed: '+req.params.id)
        res.write("No downloader found.")
        res.end()
    }
})

server.post('/chat', function(req, res) {
    res.end()
})

var userCount = 0 // a count of the total amount of users online

// keeps a total count of all connections
io.sockets.on('connection', function(socket) {
    userCount++
    io.sockets.emit('userCountUpdate', {userCount:userCount})

    socket.on('disconnect', function() {
       userCount--
       io.sockets.emit('userCountUpdate', {userCount:userCount})
    })
})


// deals with connections in rooms
io.of('/pipe').on('connection', function(socket) {
    socket.on('setRoomAndUser', function(data) {
        socket.set('room', data['room'])
        socket.set('user', data['user'])
        socket.join(data['room'])
        socket.emit('userIdAssign', {userId:socket.id})
        socket.broadcast.to(data['room']).emit('refreshFileList', {})
        socket.broadcast.to(data['room']).emit('refreshUserList', {})
        socket.emit('refreshUserList', {})
    })

    socket.on('disconnect', function() {
        socket.get('room', function(err, room) {
            socket.broadcast.to(room).emit('refreshFileList', {})
            socket.get('user', function(err, user) {
                socket.broadcast.to(room).emit('refreshUserList', {})
            })
        })
    })

    socket.on('refreshFileListRequest', function(data) {
        socket.get('room', function(err, room) {
            socket.broadcast.to(room).emit('refreshFileList', {})
            socket.emit('refreshFileList', {})
        })
    })

    socket.on('fileListUpdate', function(data) {
        socket.get('room', function(err, room) {
            socket.get('user', function(err, user) {
                socket.broadcast.to(room).emit('filesAdded', {files: data['files'], user:user, userId:socket.id})
                socket.emit('filesAdded', {files: data['files'], user:user, userId:socket.id})
            })
        })

    })

    socket.on('userListUpdate', function(data) {
        socket.get('room', function(err, room) {
            socket.get('user', function(err, user) {
                socket.broadcast.to(room).emit('userAdded', {user:user})
                socket.emit('userAdded', {user:user})
            })
        })
    })

    socket.on('chatMessage', function(data) {
        socket.get('room', function(err, room) {
            socket.get('user', function(err, user) {
                socket.broadcast.to(room).emit('chatMessage', {user:user, message:data['message']})
                socket.emit('chatMessage', {user:user, message:data['message']})
            })
        })
    })

    socket.on('downloadRequest', function(data) {
        socket.get('room', function(err, room) {
            socket.broadcast.to(room).emit('uploadRequest', {id:data['id'], requester:socket.id})
            socket.emit('uploadRequest', {id:data['id'], requester:socket.id})
        })
    })

})