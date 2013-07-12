flightarray = xmlDoc.substr(xmlDoc.indexOf("\n") + 1, xmlDoc.length).split("\n");
        for (var b in flightarray) {
            var fl = flightarray[b];
            flightarray[b] = {
                carousel: "",
                security: fl.substr(41, 1),
                fullline: fl,
                value: fl.substr(2, 8),
                ad: fl.substr(0, 1),
                di: fl.substr(1, 1),
                airline: fl.substr(2, 2),
                num: fl.substr(6, 4),
                city: fl.substr(10, 15),
                schedtime: (fl.substr(33, 2) + ":" + fl.substr(35, 2)),
                actualtime: (fl.substr(37, 2) + ":" + fl.substr(39, 2)),
                actual: (parseInt(fl.substr(37, 2)) * 60) + parseInt(fl.substr(39, 2)),
                sched: (parseInt(fl.substr(33, 2)) * 60) + parseInt(fl.substr(35, 2)),
                concourse: fl.substr(41, 1),
                gatenum: fl.substr(42, 2),
                gate: fl.substr(41, 3),
                status: fl.substr(47, 8),
                terminal: fl.substr(41, 1),
                septa: fl.substr(41, 1),
                garage: fl.substr(41, 1)
            };
            
            if (flightarray[b].gate.indexOf(" ") !== -1) {
                flightarray[b].gate = flightarray[b].gate.substr(0, 2);
            }
            
            //Calculates minutes late (-early) from the Integer time fields
            flightarray[b].calculation = flightarray[b].actual - flightarray[b].sched;
            
            //Carousel and security fields
            if (flightarray[b].ad === "A") {
                if (flightarray[b].di === "I" && flightarray[b].terminal === "A") {
                    //Recognizes only A-gated international arrivals as using the international baggage claim due to Air Canada preclearance in Terminal D
                    flightarray[b].carousel = "Baggage Claim A-West";
                }
                else if (flightarray[b].terminal === "A") {
                    //Recognizes A-gated domestic flights as using the A domestic (East) carousel
                    flightarray[b].carousel = "A-East Carousel " + flightarray[b].fullline.substr(65, 1);
                }
                else if (flightarray[b].terminal === "B" || flightarray[b].terminal === "C") {
                    flightarray[b].carousel = "B/C Carousel " + flightarray[b].fullline.substr(65, 1);
                }
                else if (flightarray[b].terminal === "D" || flightarray[b].terminal === "E") {
                    flightarray[b].carousel = "D/E Carousel " + flightarray[b].fullline.substr(65, 1);
                    flightarray[b].security = "D/E";
                }
                else if (flightarray[b].terminal === "F") {
                    flightarray[b].carousel = "F Carousel " + flightarray[b].fullline.substr(66, 1);
                }
                if (isNaN(flightarray[b].carousel.substr(flightarray[b].carousel.length - 1, 1)) && flightarray[b].carousel.substr(0, 1) !== "B") {
                    //Generally, only US Airways, Virgin, and Southwest use the FIDS for baggage claim. If a letter is in the carousel space instead of a number (and it's not in the B/C Baggage Claim), the building is returned instead.
                    flightarray[b].carousel = "Baggage Claim " + flightarray[b].carousel.substr(0, 3);
                }
                flightarray[b].carousel = flightarray[b].carousel.trim();
                if (flightarray[b].carousel.length - flightarray[b].carousel.indexOf("Carousel") === 8) {
                    flightarray[b].carousel = "Baggage Claim " + flightarray[b].carousel.substr(0, flightarray[b].carousel.indexOf(" Carousel"));
                }
            }

// Handles terminal lettering issues
            if (flightarray[b].terminal === "A") {
                if (flightarray[b].airline === "NK") {
                    //Spirit Airways checks into A-East and uses A-East security, but gates in A-West.
                    flightarray[b].terminal = "A-East";
                    flightarray[b].concourse = "A-West";
                    flightarray[b].security = "A-East";
                }
                else if (parseInt(flightarray[b].gatenum) > 13) {
                    //A14 and up are in Terminal A-West
                    flightarray[b].terminal = "A-West";
                    flightarray[b].concourse = "A-West";
                    flightarray[b].security = "A-West";
                }
                else {
                    //A13 and lower are in Terminal A-East
                    flightarray[b].terminal = "A-East";
                    flightarray[b].concourse = "A-East";
                    flightarray[b].security = "A-East";
                }
            }
            //Some garages, SEPTA stations, and terminals have shared designations. Also, SEPTA uses "-" while PHL uses "/" to combine terminal letters.
            if (flightarray[b].terminal === "B" || flightarray[b].terminal === "C") {
                if (flightarray[b].terminal === "B") {
                    flightarray[b].garage === "A/B";
                }
                flightarray[b].terminal = "B/C";
            }
            if (flightarray[b].terminal === "D" || flightarray[b].terminal === "E") {
                flightarray[b].security = "D/E";
            }
            if (flightarray[b].septa === "C" || flightarray[b].septa === "D") {
                flightarray[b].septa = "C-D";
            }
            if (flightarray[b].septa === "E" || flightarray[b].septa === "F") {
                flightarray[b].septa = "E-F";
                flightarray[b].garage = "E/F";
            }
            flightarray[b].septa = "Airport Terminal " + flightarray[b].septa;
            if (flightarray[b].airline === "DL") {
                flightarray[b].septa = "Airport Terminal E-F";
                flightarray[b].terminal = "E";
            }

        }       
