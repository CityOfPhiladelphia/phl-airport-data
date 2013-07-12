/**
 * TODO: Error handling / Logging.
 * TODO: Forever!
 */

// Include required modules.
var fs = require('fs');
var redis = require("redis");

// Watch the data file for changes.
fs.watch(__dirname + '/data/InfaxESB.dat', function(event, filename) { 
	if(event == 'change') {
		fs.readFile(__dirname + '/data/InfaxESB.dat', function(err, data) {

			//TODO: Error handling (log to syslog?)
		    if(err) throw err;

		    // Split the file on line breaks to get each record.
		    var flightRecords = data.toString().split("\n");

		    // Firt row is the date/time of update
		    var updateDateTime = (flightRecords[0].substring(0,8) + ' ' +  flightRecords[0].substring(8,10) + ':' + flightRecords[0].substring(10,12)).replace(/[\r]/g, '');

		    // Connect to Redis instance and remove records from previous update.
		    redisClient = redis.createClient();
		    redisClient.flushdb();

		    // Utility function to trim whitespace.
		    function trimSpaces(field) {
		    	return field.replace(/(^[\s]+|[\s]+$)/g, '')
		    }

		    // Process flight records.
		    for(var i=1; i<flightRecords.length; i++) {
		    	if(flightRecords[i].length > 0) {

		    		// Parse string containing flight information.
					var direction = flightRecords[i].substring(0,1).replace("D", "Departure").replace("A", "Arrival");
			    	var flightType = flightRecords[i].substring(1,2).replace("I", "International").replace("D", "Domestic");
			    	var airline = flightRecords[i].substring(2,4);
			    	var flightNumber = trimSpaces(flightRecords[i].substring(6,10));
			    	var airport = trimSpaces(flightRecords[i].substring(10,25));
			    	var scheduledDateTime = flightRecords[i].substring(25,33) + ' ' + flightRecords[i].substring(33,35) + ':' + + flightRecords[i].substring(35,37);;
			    	var estimatedTime = flightRecords[i].substring(37,39) + ':' + flightRecords[i].substring(39,41);
			    	var gate = flightRecords[i].substring(41,44);
			    	var status = trimSpaces(flightRecords[i].substring(44,55));

			    	// Create an object to hold flight details.
			    	var flightObject = 
			    		{'updated': updateDateTime, 'direction': direction, 'flightType': flightType, 'airline': airline, 
			    		 'flightNumber': flightNumber, 'airport': airport, 'scheduledDateTime': scheduledDateTime, 
			    		 'estimatedTime': estimatedTime, 'gate': gate, 'status': status
			    		};

			    	// Update redis with new flight information (for REST calls).	 
			        redisClient.set(flightNumber, JSON.stringify(flightObject));

			        // Publush updated flight information on channel matching flight number (for WebSocket connections).
			        redisClient.publish(flightNumber, JSON.stringify(flightObject));
		    	}
		    }
		    redisClient.quit();
		});
	}
});