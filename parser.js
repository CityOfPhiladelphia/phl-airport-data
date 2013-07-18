/**
 * TODO: Error handling / Logging.
 */

// Include required modules.
var fs = require('fs');
var redis = require("redis");

fs.readFile(__dirname + '/data/InfaxESB.dat', function(err, data) {

	//TODO: Error handling (log to syslog?)
    if(err) throw err;

    // Split the file on line breaks to get each record.
    var flightRecords = data.toString().split("\n");

    // Firt row is the date/time of update
    var updateDateTime = (flightRecords[0].substring(0,8) + ' ' +  flightRecords[0].substring(8,10) + ':' + flightRecords[0].substring(10,12)).replace(/[\r]/g, '');

    // Connect to Redis instance and remove records from previous update.
    redisClient = redis.createClient();
    redisClient.flushall();

    // Utility function to trim whitespace.
    function trimSpaces(field) {
    	return field.replace(/(^[\s]+|[\s]+$)/g, '')
    }

    // Process flight records.
    for(var i=1; i<flightRecords.length; i++) {
    	if(flightRecords[i].length > 0) {

    		// Parse string containing flight information.
			var direction = trimSpaces(flightRecords[i].substring(0,1).replace("D", "Departure").replace("A", "Arrival"));
	    	var flightType = trimSpaces(flightRecords[i].substring(1,2).replace("I", "International").replace("D", "Domestic"));
	    	var airline = trimSpaces(flightRecords[i].substring(2,4));
	    	var flightNumber = parseInt(trimSpaces(flightRecords[i].substring(6,10)),10);
	    	var airport = trimSpaces(flightRecords[i].substring(10,25));
	    	var scheduledDateTime = trimSpaces(flightRecords[i].substring(25,33) + ' ' + flightRecords[i].substring(33,35) + ':' + + flightRecords[i].substring(35,37));
	    	var estimatedTime = trimSpaces(flightRecords[i].substring(37,39) + ':' + flightRecords[i].substring(39,41));
	    	var gate = trimSpaces(flightRecords[i].substring(41,44));
	    	var status = trimSpaces(flightRecords[i].substring(44,55));

	    	var hashKey = direction + flightType + airline + flightNumber + airport;

	    	// Create an object to hold flight details.
	    	var flightObject = 
	    		{'updated': updateDateTime, 'direction': direction, 'flightType': flightType, 'airline': airline, 
	    		 'flightNumber': flightNumber, 'airport': airport, 'scheduledDateTime': scheduledDateTime, 
	    		 'estimatedTime': estimatedTime, 'gate': gate, 'status': status
	    		};

	    	// Update redis with new flight information (for REST calls).
	        redisClient.hmset(flightNumber, hashKey, JSON.stringify(flightObject));	// Flights by flight number.
	        redisClient.hmset(gate, hashKey, JSON.stringify(flightObject));			// Flights by gate.
	        redisClient.hmset(airport, hashKey, JSON.stringify(flightObject));		// Fights by city.
	        redisClient.hmset(direction, hashKey, JSON.stringify(flightObject));	// Flights by direction.

	        // Publush updated flight information on channel matching flight number (for WebSocket connections).
	        redisClient.publish(flightNumber + direction, JSON.stringify(flightObject));
    	}
    }
    redisClient.quit();
});