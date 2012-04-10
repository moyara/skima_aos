// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';

// Port where we'll run the websocket server
var webSocketsServerPort = 1337;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');

var Mongolian = require('mongolian');
var server = new Mongolian;

var db = server.db("test");

var gamedb = db.collection("game");

/**
 * Global variables
 */
// entire message history
// list of currently connected clients (users)
var clients = [ ];
var onChar = [ ]; // 접속중인 캐릭터 JSON
var num = 0;  // 접속중인 캐릭터 명수

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Array with some colors
var races = [
    {name:'oak', dataX:0, dataY:0},
    {name:'elf', dataX:50, dataY:0},
    {name:'human', dataX:100, dataY:0},
    {name:'magenta', dataX:0, dataY:50},
    {name:'warewolf', dataX:100, dataY:50},
    {name:'skeleton', dataX:0, dataY:100},
    {name:'ghost', dataX:50, dataY:100},
    {name:'pokemon', dataX:100, dataY:100}
];


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

    // send back chat history

    // user sent some message
    connection.on('message', function(message) {

        try {
            var json = JSON.parse(message.utf8Data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message);
            return;
        }

        if(json.type === 'move'){
            if(userRace.dataX+json.dataX <= 100 && userRace.dataX+json.dataX >= 0 && userRace.dataY+json.dataY <= 100 && userRace.dataY + json.dataY >= 0){
                userRace.dataX += json.dataX;
                userRace.dataY += json.dataY;
            }

            for(var i=0;i<num;i++){
                if(userRace.name !== onChar[i].name &&userRace.dataX == onChar[i].dataX && userRace.dataY == onChar[i].dataY){
                    console.log((new Date()) + ' there is an collision between ' + userRace.name + ' and ' + onChar[i].name);
                    userRace.dataX -= json.dataX;
                    userRace.dataY -= json.dataY;
                }
            }

            console.log((new Date()) + ' ' + userName + ' direction changed : (' + userRace.dataX + ',' + userRace.dataY + ')');
            connection.sendUTF(JSON.stringify({ type:'race', data: userRace }));

        }

        if (json.type === 'utf8') { // accept only text
            if (userName === false) { // first message sent by user is their name
                // remember user name
                userName = htmlEntities(json.utf8Data);
    		 // get random race and send it back to the user		
		userRace = races.shift();

		//입력받은 userName값을 DB에서 search -> 있을경우
		gamedb.findOne({name : userName},function(err,result){
                if(err){
                throw(err)
                }
		if(result)      
                {
                console.log(result.level);       
                onChar[num++] = userRace;
                gamedb.update({name:userName},{"$inc" : {level:1}});		
                connection.sendUTF(JSON.stringify({type:'race', data: userRace}));		       
                }
                //입력받은 userName값을 DB에서 search -> 없을경우
                else
                {	
                onChar[num++] = userRace;
                connection.sendUTF(JSON.stringify({ type:'race', data: userRace }));
		
		// DB에 이름과 종족, 만든 날짜를 전송		
		gamedb.insert({
		name : userName,
		race : userRace.name,
		created : new Date,
		level : 1})
				
                console.log((new Date()) + ' User is known as: ' + userName
                            + ' and race is ' + userRace.name);
		}
                });
                }
		else { // log and broadcast the message
                console.log((new Date()) + ' Received Message from '
                            + userName + ': ' + json.utf8Data);
                
                // we want to keep history of all sent messages
                var obj = {
                    time: (new Date()).getTime(),
                    text: htmlEntities(json.utf8Data),
                    author: userName,
                    race: userRace
                };

                // broadcast message to all connected clients
                var json = JSON.stringify({ type:'message', data: obj });
                for (var i=0; i < clients.length; i++) {
                    clients[i].sendUTF(json);
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
