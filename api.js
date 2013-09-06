/*
 * REST endpoint.
 */

// Include required modules.
var express = require('express');
var redis = require('redis');
log = require('./lib/logger').log;
var responseLog = require('./lib/response-log');
var utilities = require('./lib/utilities')();

// Port to run server on.
var port = process.argv[2] || 3000;

// Start  app.
var app = express();
var socket = require('socket.io').listen(app.listen(port),{log: false});

// Serve static assets.
app.use(express.static(__dirname));

// Bunyan JSON logging
app.use(function (req, res, next) {
  log.info({req: req}, 'REST endpoint request');
  next();
});

// Because as far as I know Express doesn't have a response event
app.use(responseLog());

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

// Get flight information by direction (Arrival / Departure).
app.get('/direction/:direction', function(req, res){
  var direction = utilities.toTitleCase(req.params.direction);
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
    if (err) {
      log.error({req: req, error: err}, 'Redis hgetall error in getFlightData function of REST request');
      return;
    }
    renderResponse(req, res, 200, utilities.makeArray(obj));
  });
  redisClient.quit();
  return;
}

// Function to render response to send to the client.
function renderResponse(req, res, statusCode, content) {
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
log.debug('Websockets and Express server listening on port', port);

socket.on('connection', function(client){
  log.info({ws_conn: client}, 'websocket connection made');

  var redisClient = redis.createClient();
  redisClient.on('error', function(err) {
    log.error({ws_conn: client, err: err}, 'Redis error in initial websockets connection');
    throw err;
  });
  client.on('subscribe', function(data) {
    log.info({ws_sub: data}, 'client subscribed');

    // If client has already subscribed to a Redis channel, get a fresh connection.
    if(redisClient.connected) {
      redisClient.quit();
      redisClient = redis.createClient();
    }

    // Respond with curret flight status.
    var flightNumber = parseInt(data.flightNumber, 10);
    redisClient.hgetall(flightNumber, function(err, obj) {
      if (err) {
        log.error({req: req, error: err}, 'Redis hgetall error in getFlightData function of websockets request');
        return;
      }
      client.emit("update", utilities.makeArray(obj));
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
    log.debug('websocket connection closed');
  });

});

// For logging only
socket.on('error', function () {
  log.error('websocket error');
});

socket.on('connect_failed', function () {
  log.error('websocket connection failure');
});