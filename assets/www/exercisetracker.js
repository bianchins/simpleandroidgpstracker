
var realDevice = true;
var debug = false;
var tts_enable = true;

if (!realDevice) {
	$(document).ready(function() { 
		$("#startTracking_stop_div").hide();
	});
}


function gps_distance(lat1, lon1, lat2, lon2)
{
	// http://www.movable-type.co.uk/scripts/latlong.html
    var R = 6371; // km
    var dLat = (lat2-lat1) * (Math.PI / 180);
    var dLon = (lon2-lon1) * (Math.PI / 180);
    var lat1 = lat1 * (Math.PI / 180);
    var lat2 = lat2 * (Math.PI / 180);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;
    
    return d;
}

document.addEventListener("deviceready", function(){
	
	if(navigator.network.connection.type == Connection.NONE){
		$("#home_network_button").text('No Internet Access')
								 .attr("data-icon", "delete")
								 .button('refresh');
	}
	
	window.plugins.tts.startup(startupTTS, fail);
	
	$("#startTracking_stop_div").hide();
	if(!debug) {
		$("#home_seedgps_button_div").hide();
	}
});


function fail(result) {
	tts_enable = false;
}

function startupTTS(result) {
 // When result is equal to STARTED we are ready to play
 if (result == TTS.STARTED) {
  //Ready to go
  tts_enable = true;
  window.plugins.tts.setLanguage('it');
 }
}

var track_id = '';      // Name/ID of the exercise
var watch_id = null;    // ID of the geolocation
var tracking_data = []; // Array containing GPS position objects
var timerID = 0;
var starting_time = 0;
var track_km = 0;

function chrono(){
           end = new Date();
           diff = end - starting_time;
           diff = new Date(diff);
           var sec = diff.getSeconds();
           var min = diff.getMinutes();
           var hr = diff.getHours()+0-1;
         
           if (sec < 10){
           sec = "0" + sec;
           }
           if (min < 10){
           min = "0" + min;
           }
           
           if (hr <= 0) { hr = "0"; }
           
           if (hr < 10){
           hr = "0" + hr;
           }
           
           $("#timer").text(hr+" : "+min+" : "+sec);
}


$(document).on('click', "#startTracking_start", function(){
    var timestamp = new Date();
	starting_time = timestamp.getTime();
	$('#startTracking_info').html('');
	// Reset watch_id and tracking_data 
	watch_id = null;
	tracking_data = [];
	
	window.plugins.statusBarNotification.notify("GPS Tracker", "GPS Tracker sta registrando...", Flag.FLAG_NO_CLEAR);
		
	var track_km = 0;
	
	var alert_km = 1;
	
	navigator.notification.vibrate(500);
	

	if(tts_enable) { 
		window.plugins.tts.speak("Inizio registrazione");
	}
	
	
	
	
	timerID = setInterval(chrono, 100);
	$("#timer").show();
	// Start tracking the User
    watch_id = navigator.geolocation.watchPosition(
    
    	// Success
        function(position){
			var tmp = {
					"longitude" : position.coords.longitude,
					"latitude" : position.coords.latitude,
					"altitude" : position.coords.altitude,
					"timestamp" :  position.timestamp,
					"speed" : position.coords.speed
			};
				if(debug) {
					$('#startTracking_info').html('latitude: ' + tmp.latitude + '<br/>' + 'longitude: ' + tmp.longitude + '<br/>' + 'Timestamp: ' + tmp.timestamp + '<br/>Speed: ' + tmp.speed);
				}
			
			//if(position.coords.speed!=null && !isNaN(position.coords.speed)) {

				//NaN fix
				if(isNaN(tmp.speed )) tmp.speed = 0;
				if(tmp.speed==null) tmp.speed = 0;
				
				$('#speed').text((tmp.speed.toFixed(2)*3600/1000) + ' km/h');
				$('#coordinate').text(tmp.latitude + ', ' + tmp.longitude);
				$('#startTracking_status').html('');
				
			//}
			//Loggo solo posizioni con velocita' maggiori di zero
			if(tmp.speed > 0) {
				
				//Aggiorno i km percorsi
				if(tracking_data.length>=1) {
					
					track_km += gps_distance(tracking_data[tracking_data.length - 1].latitude, tracking_data[tracking_data.length - 1].longitude, tmp.latitude, tmp.longitude);
					if(track_km > alert_km) {
						
						if(tts_enable) { 
							window.plugins.tts.speak("Hai percorso " + alert_km + " chilometri");
							alert_km ++;
						}
						
					}
				}
				console.log(track_km);
				$('#total_km').text(track_km.toFixed(2) + ' km');
				tracking_data.push(tmp);
			}
        },
        
        // Error
        function(error){
            console.log(error);
			console.log('errore');
        },
        
        // Settings
        { maximumAge: 10000, frequency: 3000, enableHighAccuracy: true });
    
    // Tidy up the UI
    track_id = timestamp.getUTCDate() + '/' + timestamp.getUTCMonth() + '/' + timestamp.getUTCFullYear() + ': ' + $('#activity').val();
    //console.log(tracking_data);
	//console.log(watch_id);
    $("#track_id").hide();
    $("#startTracking_start_div").hide();
	$("#startTracking_stop_div").show();
	$('#activity').selectmenu('disable');
    $("#startTracking_status").html("<strong>Ricerca segnale GPS in corso...</strong>");
});


$(document).on('click', "#startTracking_stop", function(){
	
	clearTimeout(timerID);
	
	window.plugins.statusBarNotification.clear();
	
	$('#activity').selectmenu('enable');
	
	// Stop tracking the user
	navigator.geolocation.clearWatch(watch_id);
	
	var track_object = {
				"total_km" : 0,
				"tracked_point" : tracking_data,
	};
	
	if((tracking_data != null) && (tracking_data.length > 0)) {
		// Save the tracking data
		window.localStorage.setItem(track_id, JSON.stringify(track_object));
		console.log('saved ' + JSON.stringify(tracking_data));
	}


	// Tidy up the UI
	$("#startTracking_start_div").show();
	$("#startTracking_stop_div").hide();
	if((tracking_data != null) && (tracking_data.length > 0)) {
		$("#track_info").attr("track_id", track_id);
		$.mobile.navigate( "#track_info" );
	}
	// Reset watch_id and tracking_data 
	watch_id = null;
	tracking_data = [];
});

$(document).on('click', "#home_clearstorage_button", function(){
	window.localStorage.clear();
});

$(document).on('click', "#home_seedgps_button", function(){
	var timestamp = new Date();
	window.localStorage.setItem(timestamp.getUTCDate() + '/' + timestamp.getUTCMonth() + '/' + timestamp.getUTCFullYear() + ' : Ciclismo di montagna', '{"total_km":0.88, "activity": "Ciclismo di montagna", "tracked_point":[{"timestamp":1335700802000,"altitude":null,"longitude":170.33488333333335,"accuracy":0,"latitude":-45.87475166666666,"speed":null,"altitudeAccuracy":null},{"timestamp":1335700803000,"altitude":null,"longitude":170.33481666666665,"accuracy":0,"latitude":-45.87465,"speed":null,"altitudeAccuracy":null},{"timestamp":1335700804000,"altitude":null,"longitude":170.33426999999998,"accuracy":0,"latitude":-45.873708333333326,"speed":null,"altitudeAccuracy":null},{"timestamp":1335700805000,"altitude":null,"longitude":170.33318333333335,"accuracy":0,"latitude":-45.87178333333333,"speed":null,"altitudeAccuracy":null},{"timestamp":1335700806000,"altitude":null,"longitude":170.33416166666666,"accuracy":0,"latitude":-45.871478333333336,"speed":null,"altitudeAccuracy":null},{"timestamp":1335700807000,"altitude":null,"longitude":170.33526833333332,"accuracy":0,"latitude":-45.873394999999995,"speed":null,"altitudeAccuracy":null},{"timestamp":1335700808000,"altitude":null,"longitude":170.33427333333336,"accuracy":0,"latitude":-45.873711666666665,"speed":null,"altitudeAccuracy":null},{"timestamp":1335700809000,"altitude":null,"longitude":170.33488333333335,"accuracy":0,"latitude":-45.87475166666666,"speed":null,"altitudeAccuracy":null}]}');

});

// When the user views the history page
$(document).on('pageshow', '#history', function () {
	
	// Count the number of entries in localStorage and display this information to the user
	tracks_recorded = window.localStorage.length;
	$("#tracks_recorded").html("<strong>" + tracks_recorded + "</strong> attivita' registrata/e");
	// Empty the list of recorded tracks
	$("#history_tracklist").empty();
	
	// Iterate over all of the recorded tracks, populating the list
	for(i=0; i<tracks_recorded; i++){
		$("#history_tracklist").append("<li><a href='#track_info' data-ajax='false'>" + window.localStorage.key(i) + "</a></li>");
	}
	
	// Tell jQueryMobile to refresh the list
	$("#history_tracklist").listview('refresh');

});

// When the user clicks a link to view track info, set/change the track_id attribute on the track_info page.
$(document).on('click', '#history_tracklist li a', function(){

	$("#track_info").attr("track_id", $(this).text());
	console.log($(this).text());
	$.mobile.navigate( "#track_info" );
});


// When the user views the Track Info page
$(document).on('pageshow', '#track_info', function(){
	console.log('in track_INFO');
	// Find the track_id of the workout they are viewing
	var key = $(this).attr("track_id");

	// Update the Track Info page header
	$("#track_info div[data-role=header] h1").text(key);
			
	
	// Get all the GPS data for the specific workout
	var data = window.localStorage.getItem(key);
	//console.log(data);
	//console.log(key);
	// Turn the stringified GPS data back into a JS object
	data = $.parseJSON(data);
	data = data.tracked_point;
	// Calculate the total distance travelled
	total_km = 0;
	if(data != null) {
		if(data.length>0) {
			
			for(i = 0; i < data.length; i++){
				
				if(i == (data.length - 1)){
					break;
				}
				total_km += gps_distance(data[i].latitude, data[i].longitude, data[i+1].latitude, data[i+1].longitude);
			}
			
			total_km_rounded = total_km.toFixed(2);
			
			// Calculate the total time taken for the track
			start_time = new Date(data[0].timestamp).getTime();
			end_time = new Date(data[data.length-1].timestamp).getTime();

			total_time_ms = end_time - start_time;
			total_time_s = total_time_ms / 1000;
			
			//final_time_m = Math.floor(total_time_s / 60);
			//final_time_s = total_time_s - (final_time_m * 60);

			hours = parseInt( total_time_s / 3600 ) % 24;
			minutes = parseInt( total_time_s / 60 ) % 60;
			seconds = total_time_s % 60;

			tempo_in_stringa = (hours < 10 ? "0" + hours : hours) + " : " + (minutes < 10 ? "0" + minutes : minutes) + " : " + (seconds  < 10 ? "0" + seconds : seconds);
			
			average_speed = total_km_rounded / (total_time_s / 3600);

			$('#track_info_timer').text(tempo_in_stringa);
			$('#track_info_average_speed').text('Velocita\' media ' + average_speed.toFixed(2) + ' km/h');
			$('#track_info_total_km').text(total_km_rounded + ' km percorsi');
			
			// Set the initial Lat and Long of the Google Map
			//var myLatLng = new google.maps.LatLng(data[0].latitude, data[0].longitude);

			var bounds = new google.maps.LatLngBounds();
			
			var trackCoords = [];
			
			// Add each GPS entry to an array
			for(i=0; i<data.length; i++){
				trackCoords.push(new google.maps.LatLng(data[i].latitude, data[i].longitude));
				bounds.extend(new google.maps.LatLng(data[i].latitude, data[i].longitude));
			}
			
			// Google Map options
			var myOptions = {
			  zoom: 15,
			  center: bounds.getCenter(), //myLatLng,
			  mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			
			// Create the Google Map, set options
			var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
			
			map.fitBounds(bounds);
			
			// Plot the GPS entries as a line on the Google Map
			var trackPath = new google.maps.Polyline({
			  path: trackCoords,
			  strokeColor: "#FF0000",
			  strokeOpacity: 1.0,
			  strokeWeight: 2
			});

			// Apply the line to the map
			trackPath.setMap(map);
		}
	}
});

$( document ).on( "change", "#debug_option", function() {
  if($('#debug_option').val()=="on") {
  	debug = true;
  	$("#home_seedgps_button_div").show();
  }
  else {
  	debug=false;
  	$("#home_seedgps_button_div").hide();
  }
});

$( document ).on( "change", "#tts_option", function() {
  if($('#tts_option').val()=="on") tts_enable = true;
  else tts_enable=false;
});

document.addEventListener("backbutton", function(){
    navigator.app.exitApp();
});
