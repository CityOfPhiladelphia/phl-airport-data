// Include required modules.
var fs = require('fs');
var redis = require("redis");
log = require('./lib/logger').log;
var utilities = require('./lib/utilities')();

/*
 * File parser
 */

fs.readFile(__dirname + '/data/InfaxESB.dat', function(err, data) {

    if (err) {
      log.error({error: err}, 'Error parsing flight file');
      process.exit(1);
    }

    // Split the file on line breaks to get each record.
    var flightRecords = data.toString().split("\n");

    // Firt row is the date/time of update
    var updateDateTime = utilities.getUpdateTime(flightRecords[0]);

    flightRecords.splice(0,1).sort(function(a, b) {
        return parseInt(a.substring(33,37)) - parseInt(b.substring(33,37));
    });

    // Connect to Redis instance and remove records from previous update.
    redisClient = redis.createClient();
    redisClient.on('error', function(err) {
      log.error({updateDateTime: updateDateTime, err: err}, 'Redis error in parser');
      process.exit(1);
    });

    // Flush the DB before inserting new flight records.
    redisClient.flushall();

    // Process flight records.
    for(var i=1; i<flightRecords.length; i++) {
      if(flightRecords[i].length > 0) {

        // Parse each string in file and generate flight record.
        utilities.parseLine(flightRecords[i], updateDateTime, function(redisClient, flightObject, hashKey) {

          // Update redis with new flight information (for REST calls).
          redisClient.hmset(flightObject.flightNumber, hashKey, JSON.stringify(flightObject));  // Flights by flight number.
          redisClient.hmset(flightObject.gate, hashKey, JSON.stringify(flightObject));          // Flights by gate.
          redisClient.hmset(flightObject.airport, hashKey, JSON.stringify(flightObject));       // Fights by city.
          redisClient.hmset(flightObject.direction, hashKey, JSON.stringify(flightObject));     // Flights by direction.

          // Publish updated flight information on channel matching flight number (for WebSocket connections).
          redisClient.publish(flightObject.flightNumber + flightObject.direction, JSON.stringify(flightObject));

        });
      }
    }
    redisClient.quit(function() {
      process.exit(0);
    });
});