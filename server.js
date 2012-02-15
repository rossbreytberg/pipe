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
    if (responses[req.params.id] == null) {
        responses[req.params.id] = [res]
    } else {
        responses[req.params.id].push(res)
    }
    res.writeHead(200, {'connection':'keep-alive', 'content-disposition':'inline;filename='+req.query.filename, 'content-type':'application/octet-stream'})
})

server.post('/upload/:id', function(req, res) {
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
        res.write("File sent.")
        res.end()
    }
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
        socket.broadcast.to(socket.room).emit('refreshFilesList', {})
    })

    socket.on('disconnect', function() {
        socket.get('room', function(err, room) {
            socket.broadcast.to(room).emit('refreshFilesList', {})
        })
        
    })

    socket.on('refreshFilesListRequest', function(data) {
        socket.get('room', function(err, room) {
            socket.broadcast.to(room).emit('refreshFilesList', {})
            socket.emit('refreshFilesList', {})
        })
    })

    socket.on('filesListUpdate', function(data) {
        socket.get('room', function(err, room) {
            socket.get('user', function(err, user) {
                socket.broadcast.to(room).emit('filesAdded', {files: data['files'], user:user})
                socket.emit('filesAdded', {files: data['files'], user:user})
            })
        })

    })

    socket.on('downloadRequest', function(data) {
        socket.get('room', function(err, room) {
            socket.broadcast.to(room).emit('uploadRequest', {id:data['id']})
            socket.emit('beginDownload', {id:data['id'], name:data['file'].name})
        })
    })
})