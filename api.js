/**
 * TODO: Error handling / Logging.
 */

// Include required modules.
var express = require('express');
var socketio = require('socket.io');
var redis = require("redis");

// Port to run server on.
var port = process.argv[2] || 3000;

// Start Express app.
var app = express();

// Serve static assets.
app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});

app.get('/assets/css/:file', function(req, res) {
	res.sendfile(__dirname + '/assets/css/' + req.params.file);
});

app.get('/assets/js/:file', function(req, res) {
	res.sendfile(__dirname + '/assets/js/' + req.params.file);
});

/*
 * REST endpoint.
 */

// Get flight information by flight number. 
app.get('/number/:number', function(req, res){
	var flightNumber = parseInt(req.params.number, 10);
	console.log(flightNumber);
	getFlightData(flightNumber, req, res);
});

// Get flight information by gate number.
app.get('/gate/:gate', function(req, res){
	var gate = req.params.gate;
	getFlightData(gate, req, res);
});

// Get flight inforamtion by city.
app.get('/city/:city', function(req, res){
	var city = req.params.city;
	getFlightData(city, req, res);
});

// Get flight information by direction (Aarrival / Departure).
app.get('/direction/:direction', function(req, res){
	var direction = req.params.direction;
	getFlightData(direction, req, res);
});

// Function to retrieve requested flight infomation and send response.
function getFlightData(type, req, res) {
	var redisClient = redis.createClient();
	redisClient.hgetall(type, function(err, obj) {
		res.set('Cache-Control', 'max-age=60');
		if(req.query.callback) {
			res.jsonp(200, makeArray(obj));
		}
		else {
			res.json(200, makeArray(obj));
		}
	});
	redisClient.quit();
	return;
}

// Utility function to turn an object from Redis into an array of objects to send to the client.
function makeArray(obj) {
	var flightArray = [];
	for(property in obj) {
		flightArray.push(obj[property]);
	}
	return flightArray;
}

/*
 * WebSocket endpoint.
 */
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
		var flightNumber = parseInt(clientMessage.flightNumber, 10);
		redisClient.hgetall(flightNumber, function(err, obj) {
			// Construct the array of flight objects to return.
			var flightArray = [];
			for(property in obj) {
				var flight = JSON.parse(obj[property]);
				if (clientMessage.direction == flight.direction) {
					flightArray.push(obj[property]);
				}
			}
			client.emit("update", flightArray);
		});

		// Listen on Redis channel for updates.
		redisClient.subscribe(flightNumber + clientMessage.direction);
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