// Include required modules.
var fs = require('fs');
var redis = require("redis");
var log = require('./lib/logger').log;

// Utility function to trim whitespace.
function trimSpaces(field) {
  return field.replace(/(^[\s]+|[\s]+$)/g, '')
}

fs.readFile(__dirname + '/data/InfaxESB.dat', function(err, data) {

    if (err) {
      log.error({error: err}, 'Error parsing flight file');
      process.exit(1);
    }

    // Split the file on line breaks to get each record.
    var flightRecords = data.toString().split("\n");

    // Firt row is the date/time of update
    var updateDateTime = new Date(trimSpaces((flightRecords[0].substring(0,8) + ' ' +  flightRecords[0].substring(8,10) + ':' + flightRecords[0].substring(10,12))));

    flightRecords.splice(0,1).sort(function(a, b) {
        return parseInt(a.substring(33,37)) - parseInt(b.substring(33,37));
    });

    // Connect to Redis instance and remove records from previous update.
    redisClient = redis.createClient();
    redisClient.on('error', function(err) {
      log.error({updateDateTime: updateDateTime, err: err}, 'Redis error in parser');
      process.exit(1);
    });
    redisClient.flushall();

    // Process flight records.
    for(var i=1; i<flightRecords.length; i++) {
      if(flightRecords[i].length > 0) {

        // Parse string containing flight information.
        var direction = trimSpaces(flightRecords[i].substring(0,1).replace("D", "Departure").replace("A", "Arrival"));
        var flightType = trimSpaces(flightRecords[i].substring(1,2).replace("I", "International").replace("D", "Domestic"));
        var airline = trimSpaces(flightRecords[i].substring(2,4));
        var flightNumber = parseInt(trimSpaces(flightRecords[i].substring(6,10)),10);
        var airport = trimSpaces(flightRecords[i].substring(10,25));
        var scheduledDateTime = new Date(trimSpaces(flightRecords[i].substring(25,33) + ' ' + flightRecords[i].substring(33,35) + ':' + flightRecords[i].substring(35,37)));
        var estimatedDateTime = new Date(trimSpaces(flightRecords[i].substring(25,33) + ' ' + flightRecords[i].substring(37,39) + ':' + flightRecords[i].substring(39,41)));
        var gate = trimSpaces(flightRecords[i].substring(41,44));
        var status = trimSpaces(flightRecords[i].substring(44,55));
        var concourse = gate.substring(0,1);
        var carousel = trimSpaces(flightRecords[i].substring(65));
        var terminal = gate.substring(0,1).replace(/[BC]/,"B/C");
        var security = gate.substring(0,1).replace(/[DE]/,"D/E");
        var garage = terminal.replace("A","A/B").replace(/[EF]/,"E/F");
        var septa = "Airport Terminal " + concourse.replace(/[CD]/,"C-D").replace(/[EF]/,"E-F");

        //Increment to next day if applicable
        var schedHour = parseInt(flightRecords[i].substring(33,35));
        var estHour = parseInt(flightRecords[i].substring(37,39));
        if (schedHour > 3 && estHour < (schedHour-2)) {
            estimatedDateTime.setDate(estimatedDateTime.getDate()+1);
        }

        if (status === "Arrival") {
          if (flightType === "I" && terminal === "A") {
              carousel = "Baggage Claim A-West";
          }
          else if (terminal === "A") {
              carousel = "A-East Carousel " + flightRecords[i].substring(65, 66);
          }
          else if (terminal === "B" || terminal === "C") {
              carousel = "B/C Carousel " + flightRecords[i].substring(65, 66);
          }
          else if (terminal === "D" || terminal === "E") {
              carousel = "D/E Carousel " + flightRecords[i].substring(65, 66);
          }
          else if (terminal === "F") {
              carousel = "F Carousel " + flightRecords[i].substring(66, 67);
          }
          if (isNaN(carousel.substr(carousel.length - 1, 1)) && carousel.substr(0, 1) !== "B") {
              carousel = "Baggage Claim " + carousel.substr(0, 3);
          }
          carousel = carousel.trim();
          if (carousel.length - carousel.indexOf("Carousel") === 8) {
              carousel = "Baggage Claim " + carousel.substr(0, carousel.indexOf(" Carousel"));
          }
        }

        // Handles terminal lettering issues
        if (terminal === "A") {
          if (airline === "NK") {
              terminal = "A-East";
              concourse = "A-West";
              security = "A-East";
          }
          else if (parseInt(gate.substring(1)) > 13) {
              terminal = "A-West";
              concourse = "A-West";
              security = "A-West";
          }
          else {
              terminal = "A-East";
              concourse = "A-East";
              security = "A-East";
          }
        }
        if (airline === "DL") {
          septa = "Airport Terminal E-F";
          terminal = "E";
        }

        var hashKey = direction + flightType + airline + flightNumber + airport;

        // Create an object to hold flight details.
        var flightObject = {
          'updated': updateDateTime, 'direction': direction, 'flightType': flightType, 'airline': airline,
          'flightNumber': flightNumber, 'airport': airport, 'scheduledDateTime': scheduledDateTime,
          'estimatedDateTime': estimatedDateTime, 'gate': gate, 'status': status, 'carousel': carousel,
          'terminal': terminal, 'security': security,'garage': garage, 'septa': septa
        };

        // Update redis with new flight information (for REST calls).
        redisClient.hmset(flightNumber, hashKey, JSON.stringify(flightObject)); // Flights by flight number.
        redisClient.hmset(gate, hashKey, JSON.stringify(flightObject));     // Flights by gate.
        redisClient.hmset(airport, hashKey, JSON.stringify(flightObject));    // Fights by city.
        redisClient.hmset(direction, hashKey, JSON.stringify(flightObject));  // Flights by direction.

        // Publush updated flight information on channel matching flight number (for WebSocket connections).
        redisClient.publish(flightNumber + direction, JSON.stringify(flightObject));
      }
    }
    redisClient.quit();
});