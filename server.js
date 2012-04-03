// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';

// Port where we'll run the websocket server
var webSocketsServerPort = 1337;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');

/**
 * Global variables
 */
// entire message history
//var history = [ ];
// list of currently connected clients (users)
var clients = [ ];

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Array with some races
var races = [];
races[0] = {name:'oak', baseX:0, baseY:0};
races[1] = {name:'elf', baseX:0, baseY:0};
races[2] = {name:'human', baseX:0, baseY:0};
races[3] = {name:'magenta', baseX:0, baseY:0};
races[4] = {name:'warewolf', baseX:0, baseY:0};
races[5] = {name:'skeleton', baseX:0, baseY:0};
races[6] = {name:'ghost', baseX:0, baseY:0};
races[7] = {name:'pokemon', baseX:0, baseY:0};
// ... in random order
races.sort(function(a,b) { return Math.random() > 0.5; } );

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
    // Not important for us. We're writing WebSocket server, not HTTP server
});
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. To be honest I don't understand why.
    httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    // accept connection - you should check 'request.origin' to make sure that
    // client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin); 
    // we need to know client index to remove them on 'close' event
    var index = clients.push(connection) - 1;
    var userName = false;
    var userRace = false;

    console.log((new Date()) + ' Connection accepted.');

    // user sent some message
    connection.on('message', function(message) {
        if (message.type === 'utf8') { // accept only text
            if (userName === false) { // first message sent by user is their name
                // remember user name
                userName = htmlEntities(message.utf8Data.chat);
                // get random color and send it back to the user
                userRace = races.shift();
                connection.sendUTF(JSON.stringify({ type:'races', data: userRace }));
                console.log((new Date()) + ' User is known as: ' + userName
                            + ' is ' + userRace.name);

            }
			else { // log and broadcast the message
                
				if(message.uft8Data.type === 'chat'){
					console.log((new Date()) + ' Received Message from '
		                        + userName + ': ' + message.utf8Data.chat);
		            
		            // we want to keep history of all sent messages
		            var obj = {
		                time: (new Date()).getTime(),
		                text: htmlEntities(message.utf8Data),
		                author: userName,
		                race: userRace
		            };
		            
		            // broadcast message to all connected clients
		            var json = JSON.stringify({ type:'message', data: obj });
		            for (var i=0; i < clients.length; i++) {
		                clients[i].sendUTF(json);
		            }
				}
				else{
					console.log(userName + 'want to move' + message.utf8Data.code);
				}
			}
		}
	});

    // user disconnected
    connection.on('close', function(connection) {
        if (userName !== false && userRace !== false) {
            console.log((new Date()) + " Peer "
                + connection.remoteAddress + " disconnected.");
            // remove user from the list of connected clients
            clients.splice(index, 1);
            // push back user's color to be reused by another user
            races.push(userRace);
        }
    });

});