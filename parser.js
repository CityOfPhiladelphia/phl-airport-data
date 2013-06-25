// Include required modules.
var fs = require('fs');
var redis = require("redis");

// TODO: Change to fs.watch.
fs.readFile('data/InfaxESB.dat.dat', function(err, data) {
    if(err) throw err;

    // Split the file on line breaks to get each record.
    var flightRecords = data.toString().split("\n");

    // Firt row is the date/time of update
    var updateDateTime = flightRecords[0].replace(/[\r]/g, '');

    // Connect to Redis instance and remove records from previous update.
    redisClient = redis.createClient();
    redisClient.flushdb();

    // Process flight records.
    for(var i=1; i<flightRecords.length; i++) {
    	if(flightRecords[i].length > 0) {

    		// Parse string containing flight information (it ain't pretty, but it gets the job done!)
			var direction = flightRecords[i].substring(0,1).replace('D', 'Departure').replace('A', 'Arrival');
	    	var flightType = flightRecords[i].substring(1,2).replace('I', 'International').replace('D', 'Domestic');
	    	var airline = flightRecords[i].substring(2,4);
	    	var flightNumber = flightRecords[i].substring(6,10).replace(/(^[\s]+|[\s]+$)/g, '');
	    	var airport = flightRecords[i].substring(10,25).replace(/(^[\s]+|[\s]+$)/g, '');
	    	var scheduledDateTime = flightRecords[i].substring(25,37);
	    	var estimatedDateTime = flightRecords[i].substring(37,41);
	    	var gate = flightRecords[i].substring(41,44);
	    	var status = flightRecords[i].substring(44,54).replace(/(^[\s]+|[\s]+$)/g, '');

	    	// Create an object to hold flight details.
	    	var flightObject = 
	    		{'updated': updateDateTime, 'direction': direction, 'flightType': flightType, 'airline': airline, 
	    		 'flightNumber': flightNumber, 'airport': airport, 'scheduledDateTime': scheduledDateTime, 
	    		 'estimatedDateTime': estimatedDateTime, 'gate': gate, 'status': status
	    		};

	    	// Update redis with new flight information (for REST calls).	 
	        redisClient.set(flightNumber, JSON.stringify(flightObject));

	        // Publush updated flight information on channel matching flight number (for WebSocket connections).
	        redisClient.publish(flightNumber, JSON.stringify(flightObject));
    	}
    }
    redisClient.quit();
    console.log("Done.\n");
});