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
	res.render('index')
})

server.get('/:id', function(req, res) {
	res.render('pipe', {id:req.params.id})
})

server.get('/download/:id', function(req, res) {
	if (responses[req.params.id] == null) {
		responses[req.params.id] = [res]
	} else {
		responses[req.params.id].push(res)
	}
	res.writeHead(200, {connection: 'keep-alive'})
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

var connections = {} // stores arrays of sockets indexed by roomid they belong to
var roomids = {} // stores roomids indexed by socket ids

io.sockets.on('connection', function(socket) {
	socket.on('connected', function(data) {
		var roomid = data['roomid']
		if (connections[roomid] == null) {
			connections[roomid] = [socket]
		} else {
			connections[roomid].push(socket)
		}
		roomids[socket.id] = roomid
	})
	socket.on('upload', function(data) {
		var roomid = roomids[socket.id]
		for (var i = 0; i < connections[roomid].length; i++) {
			if (connections[roomid][i] != socket) {
				connections[roomid][i].emit('download', {filename:data['filename']})
			}
		}
	})
	socket.on('disconnect', function() {
		//console.log('Disconnected: '+socket.id)
		var roomid = roomids[socket.id]
		delete roomids[socket.id]
		var roomSockets = connections[roomid]
		//console.log('ROOM ID: '+roomid)
		//console.log('CONNECTIONS: '+connections)
		//console.log('ROOM SOCKETS: '+roomSockets)
	})
})