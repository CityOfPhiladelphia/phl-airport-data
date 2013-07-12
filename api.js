/**
 * TODO: Error handling / Logging.
 * TODO: Forever!
 */

// Include required modules.
var express = require('express');
var socketio = require('socket.io');
var redis = require("redis");

// Port to run server on.
var port = process.argv[2] || 3000;

var app = express();

// REST endpoint.
app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});

app.get('/assets/css/:file', function(req, res) {
	res.sendfile(__dirname + '/assets/css/' + req.params.file);
});

app.get('/assets/js/:file', function(req, res) {
	res.sendfile(__dirname + '/assets/js/' + req.params.file);
});

app.get('/:number', function(req, res){
	var flightNumber = req.params.number;
	var redisClient = redis.createClient();
	redisClient.get(flightNumber, function(err, reply) {
		res.set('Cache-Control', 'max-age=60');
		if(req.query.callback) {
			res.jsonp(200, reply);
		}
		else {
			res.json(200, reply);
		}
	});
	redisClient.quit();
});

// WebSocket endpoint.
var socket = require('socket.io').listen(app.listen(port),{log: false});

socket.on('connection', function(client){

	var redisClient = redis.createClient();

	client.on('send', function(data) {

		// If client is already subscribed, get a fresh connection
		if(redisClient.connected) {
			redisClient.quit();
			redisClient = redis.createClient();
		}		

		// Respond with curret flight status.
		redisClient.get(data, function(err, reply) {
			client.emit("update", reply);
		});

		// Listen on Redis channel for updates.
		redisClient.subscribe(data);
		redisClient.on("message", function (channel, message) {
			client.emit("update", message);
		});
	});

	client.on('disconnect', function () {
		redisClient.quit();
	});

}); 	