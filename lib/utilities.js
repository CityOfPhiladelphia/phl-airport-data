Utilities = function() {};

// Trim whitespace
Utilities.prototype.trimSpaces = function(field) {
	return field.replace(/(^[\s]+|[\s]+$)/g, '');
};

// Get update time from flight inforamtion file.
Utilities.prototype.getUpdateTime = function(line) {
	return new Date(this.trimSpaces((line.substring(0,8) + ' ' +  line.substring(8,10) + ':' + line.substring(10,12))));
};

// Turn an object from Redis into an array of objects to send to the client.
Utilities.prototype.makeArray = function(obj) {
  var flightArray = [];
  for(property in obj) {
    flightArray.push(JSON.parse(obj[property]));
  }
  return flightArray;
};

// Convert text to titlecase.
Utilities.prototype.toTitleCase = function(str) {
    return str.replace(/\w\S*/g, function(txt){
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

// Parse a line from the flight inforamtion file.
Utilities.prototype.parseLine = function(line, updateDateTime, callback) {
  var direction = this.trimSpaces(line.substring(0,1).replace("D", "Departure").replace("A", "Arrival"));
  var flightType = this.trimSpaces(line.substring(1,2).replace("I", "International").replace("D", "Domestic"));
  var airline = this.trimSpaces(line.substring(2,4));
  var flightNumber = parseInt(this.trimSpaces(line.substring(6,10)),10);
  var airport = this.trimSpaces(line.substring(10,25));
  var scheduledDateTime = new Date(this.trimSpaces(line.substring(25,33) + ' ' + line.substring(33,35) + ':' + line.substring(35,37)));
  var estimatedDateTime = new Date(this.trimSpaces(line.substring(25,33) + ' ' + line.substring(37,39) + ':' + line.substring(39,41)));
  var gate = this.trimSpaces(line.substring(41,44));
  var iata = this.trimSpaces(line.substring(44,47));
  var status = this.trimSpaces(line.substring(47,55));
  var concourse = gate.substring(0,1);
  var carousel = this.trimSpaces(line.substring(65));
  var terminal = gate.substring(0,1).replace(/[BC]/,"B/C");
  var security = gate.substring(0,1).replace(/[DE]/,"D/E");
  var garage = terminal.replace("A","A/B").replace(/[EF]/,"E/F");
  var septa = "Airport Terminal " + concourse.replace(/[CD]/,"C-D").replace(/[EF]/,"E-F");

  //Increment to next day if applicable
  var schedHour = parseInt(line.substring(33,35));
  var estHour = parseInt(line.substring(37,39));
  if (schedHour > 3 && estHour < (schedHour-2)) {
      estimatedDateTime.setDate(estimatedDateTime.getDate()+1);
  }

  if (status === "Arrival") {
    if (flightType === "I" && terminal === "A") {
        carousel = "Baggage Claim A-West";
    }
    else if (terminal === "A") {
        carousel = "A-East Carousel " + line.substring(65, 66);
    }
    else if (terminal === "B" || terminal === "C") {
        carousel = "B/C Carousel " + line.substring(65, 66);
    }
    else if (terminal === "D" || terminal === "E") {
        carousel = "D/E Carousel " + line.substring(65, 66);
    }
    else if (terminal === "F") {
        carousel = "F Carousel " + line.substring(66, 67);
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
  if (terminal == "A") {
    if (airline == "NK") {
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

  // Special handling for Delta Airlines
  if (airline == "DL") {
    septa = "Airport Terminal E-F";
    terminal = "E";
  }

  // Create a unique hash key.
  var hashKey = direction + flightType + airline + flightNumber + airport;

  // Create an object to hold flight details.
  var flightObject = {
    'updated': updateDateTime, 'direction': direction, 'flightType': flightType, 'airline': airline,
    'flightNumber': flightNumber, 'airport': airport, 'scheduledDateTime': scheduledDateTime,
    'estimatedDateTime': estimatedDateTime, 'gate': gate, 'iata': iata, 'status': status, 'carousel': carousel,
    'terminal': terminal, 'security': security,'garage': garage, 'septa': septa
  };

  callback(redisClient, flightObject, hashKey);
  return;
};

module.exports = function() {
	return new Utilities();
};
