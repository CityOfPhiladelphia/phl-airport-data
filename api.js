// Include required modules.
var express = require('express');
var socketio = require('socket.io');
var redis = require("redis");

var app = express();

// REST endpoint.
app.get('/', function(req, res){
  res.send('hello world');
});

app.get('/:number', function(req, res){
	var flightNumber = req.params.number;
	var redisClient = redis.createClient();
	redisClient.get(flightNumber, function(err, reply) {
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
var socket = require('socket.io').listen(app.listen(3000));

socket.on('connection', function(client){

	var redisClient = redis.createClient();

	client.on('send', function(data) {

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