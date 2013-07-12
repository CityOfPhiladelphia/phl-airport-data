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

app.get('/a/:number', function(req, res){
	var flightNumber = req.params.number;
	getFlightInformation(0, flightNumber, res, req);
});

app.get('/d/:number', function(req, res){
	var flightNumber = req.params.number;
	getFlightInformation(1, flightNumber, res, req);
});

function getFlightInformation(direction, flightNumber, res, req) {
	var redisClient = redis.createClient();
	redisClient.select(direction);
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
	return;
}

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

		var clientMessage = JSON.parse(data);
	   	if(clientMessage.direction == "Arrival") {
	   		redisClient.select(0); // Database for arriving flights.
	   	} else {
	   		redisClient.select(1); // Database for departing flights.
	   	}

		// Respond with curret flight status.
		redisClient.get(clientMessage.flightNumber, function(err, reply) {
			client.emit("update", reply);
		});

		// Denotes whether the client is subscribed to an arriving or departing flight.
		client.set('direction', clientMessage.direction);

		// Listen on Redis channel for updates.
		redisClient.subscribe(clientMessage.flightNumber);
		redisClient.on("message", function (channel, message) {
			
			// When a message on a channel is recevied, ensure flight direction matches client subscription.
			var channelMessage = JSON.parse(message);
			client.get('direction', function(err, name) {
				if(channelMessage.direction == name) {
					client.emit("update", message);
				}
			});			
		});
	});

	client.on('disconnect', function () {
		redisClient.quit();
	});

}); 	