/**
 * TODO: Error handling / Logging.
 */

// Include required modules.
var express = require('express');
var socketio = require('socket.io');
var redis = require("redis");

// Port to run server on.
var port = process.argv[2] || 3000;

var app = express();

// Server static assets.
app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});

app.get('/assets/css/:file', function(req, res) {
	res.sendfile(__dirname + '/assets/css/' + req.params.file);
});

app.get('/assets/js/:file', function(req, res) {
	res.sendfile(__dirname + '/assets/js/' + req.params.file);
});

// REST endpoint.
app.get('/:number', function(req, res){
	var flightNumber = req.params.number;
	var redisClient = redis.createClient();
	redisClient.hgetall(flightNumber, function(err, obj) {

		res.set('Cache-Control', 'max-age=60');
		if(req.query.callback) {
			res.jsonp(200, makeArray(obj));
		}
		else {
			res.json(200, makeArray(obj));
		}
	});
	redisClient.quit();
});

// WebSocket endpoint.
var socket = require('socket.io').listen(app.listen(port),{log: false});

socket.on('connection', function(client){

	var redisClient = redis.createClient();

	client.on('send', function(data) {

		// If client has already subscribed to a Redis channel, get a fresh connection.
		if(redisClient.connected) {
			redisClient.quit();
			redisClient = redis.createClient();
		}

		var clientMessage = JSON.parse(data);

		// Respond with curret flight status.
		redisClient.hgetall(clientMessage.flightNumber, function(err, obj) {
			// Construct the array of flight objects to return.
			client.emit("update", makeArray(obj));
		});

		// Listen on Redis channel for updates.
		redisClient.subscribe(clientMessage.flightNumber);
		redisClient.on("message", function (channel, message) {			
			// When a message on a channel is recevied, send to client.
			var channelMessage = JSON.parse(message);
			client.emit("update", new Array(message));		
			});
	});

	client.on('disconnect', function () {
		redisClient.quit();
	});

});

// Utility function to turn an object from Redis into an array of objects to send to the client.
function makeArray(obj) {
	var flightArray = [];
	for(property in obj) {
		flightArray.push(obj[property]);
	}
	console.log(flightArray);
	return flightArray;
}