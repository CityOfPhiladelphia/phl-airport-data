/*
 * REST endpoint.
 */

// Include required modules.
var express = require('express');
var redis = require("redis");

// Port to run server on.
var port = process.argv[2] || 3000;

// Start Express app.
var app = express();

// Serve static assets.
app.use(express.static(__dirname));

// Get flight information by flight number. 
app.get('/number/:number', function(req, res){
	var flightNumber = parseInt(req.params.number, 10);
	getFlightData(flightNumber, req, res);
});

// Get flight information by gate number.
app.get('/gate/:gate', function(req, res){
	var gate = req.params.gate.toUpperCase();
	getFlightData(gate, req, res);
});

// Get flight information by direction (Aarrival / Departure).
app.get('/direction/:direction', function(req, res){
	var direction = req.params.direction.toTitleCase();
	getFlightData(direction, req, res);
});

// Get flight inforamtion by city.
app.get('/city/:city', function(req, res){
	var city = req.params.city.toUpperCase();
	getFlightData(city, req, res);
});

// Get a list of cities with current flights (matches on partial city name).
app.get('/cities/:city', function(req, res){
	var city = req.params.city.toUpperCase();
	if(city.length < 2) {
		renderResponse(req, res, 400, { error: 'City name must be a minimum of two characters' } );
	}
	else {
		var redisClient = redis.createClient();
		redisClient.keys(city + '*', function(err, keylist) {
		renderResponse(req, res, 200, keylist);
		redisClient.quit();
	});

	}
});

// Function to retrieve requested flight infomation and send response.
function getFlightData(type, req, res) {
	var redisClient = redis.createClient();
	redisClient.hgetall(type, function(err, obj) {
		renderResponse(req, res, 200, makeArray(obj));
	});
	redisClient.quit();
	return;
}

// Utility function to turn an object from Redis into an array of objects to send to the client.
function makeArray(obj) {
	var flightArray = [];
	for(property in obj) {
		flightArray.push(JSON.parse(obj[property]));
	}
	return flightArray;
}

// Convert text to titlecase.
String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function(txt){
    	return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

// Function to render response to send to the client.
function renderResponse(req, res, statusCode, content) {
	res.set('Cache-Control', 'max-age=60');
	if(req.query.callback) {
		res.jsonp(statusCode, content);
	}
	else {
		res.json(statusCode, content);
	}
	return;	
}

/*
 * WebSocket endpoint.
 */
var socket = require('socket.io').listen(app.listen(port),{log: false});
socket.on('connection', function(client){

	var redisClient = redis.createClient();
	client.on('subscribe', function(data) {

		// If client has already subscribed to a Redis channel, get a fresh connection.
		if(redisClient.connected) {
			redisClient.quit();
			redisClient = redis.createClient();
		}

		// Respond with curret flight status.
		var flightNumber = parseInt(data.flightNumber, 10);
		redisClient.hgetall(flightNumber, function(err, obj) {
			// Construct the array of flight objects to return.
			var flightArray = [];
			for(property in obj) {
				var flight = JSON.parse(obj[property]);
				if (data.direction == flight.direction) {
					flightArray.push(JSON.parse(obj[property]));
				}
			}
			client.emit("update", flightArray);
		});

		// Listen on Redis channel for updates.
		redisClient.subscribe(flightNumber + data.direction);
		redisClient.on("message", function (channel, message) {			
			// When a message on a channel is recevied, send to client.
			client.emit("update", new Array(JSON.parse(message)));		
		});
	});

	client.on('disconnect', function () {
		redisClient.quit();
	});

});