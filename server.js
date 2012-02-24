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
    console.log('In room "'+req.query.room+'", user '+req.query.downloader+' is downloading file "'+req.query.filename+'" ('+req.query.filetype+') from user '+req.query.uploader)
    res.connection.setTimeout(0)
    sockets[req.query.uploader].emit('uploadRequest', {id:req.params.id, requester:req.query.downloader})
    if (responses[req.params.id] == null) {
        responses[req.params.id] = res
    } else {
        res.end()
    }
    res.writeHead(200, {'connection':'keep-alive', 'content-disposition':'attachment;filename='+req.query.filename, 'content-length':req.query.size, 'content-type':req.query.filetype})
})

var pausecount = 0
var resumecount = 0

server.post('/upload/:id', function(req, res) {
    var form = new formidable.IncomingForm();
        form.parse(req)
        form.onPart = function(part) {
            responses[req.params.id].on('drain', function() {
                form.resume()
                console.log('resume'+resumecount)
                resumecount++
            })
            part.on('data', function(data) {
                if(!responses[req.params.id].write(data)) {
                    form.pause()
                    console.log('pause'+pausecount)
                    pausecount++
                }
            })
            part.on('end', function() {
                responses[req.params.id].end()
                delete responses[req.params.id]
                res.write("File sent.")
                res.end()
            })
        }
    res.end()
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

// stores sockets indexed by socketIds
var sockets = {}

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
        sockets[socket.id] = socket
        console.log('User '+data['user']+' ('+socket.id+') joined room '+data['room'])
    })

    socket.on('disconnect', function() {
        socket.get('room', function(err, room) {
            socket.broadcast.to(room).emit('refreshFileList', {})
            socket.broadcast.to(room).emit('refreshUserList', {})
        })
        delete sockets[socket.id]
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

})