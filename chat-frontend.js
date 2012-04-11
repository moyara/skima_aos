$(function () {
    "use strict";

    // for better performance - to avoid searching in DOM
    var content = $('#content');
    var input = $('#input');
    var status = $('#status');
    var wrapper = $('#wrapper');

    // my color assigned by the server
    var myRace = false;
    // my name sent to the server
    var myName = false;

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    // if browser doesn't support WebSocket, just show some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
                                    + 'support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }

    // open connection
    var connection = new WebSocket('ws://10.0.2.15:1337');

    connection.onopen = function () {
        // first we want users to enter their names
        input.removeAttr('disabled');
        status.text('Choose name:');
    };

    connection.onerror = function (error) {
        // just in there were some problems with conenction...
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
                                    + 'connection or the server is down.</p>' } ));
    };

    // most important part - incoming messages
    connection.onmessage = function (message) {
        // try to parse JSON message. Because we know that the server always returns
        // JSON this should work without any problem but we should make sure that
        // the massage is not chunked or otherwise damaged.
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }

        // 상대방의 위치가 바뀌었을 때
        if (json.type === 'position') {
            var race = json.data;
            var position = race.dataY*19 + race.dataX;
            var color = json.color;
            if(color==='red'){
              $('div[class='+position+']').css('background-color','red');
            }
            else if(color==='white'){
              $('div[class='+position+']').css('background-color','white');
            }
        }
        // 자신의 위치가 바뀌었을 때
        else if (json.type === 'race') {
            myRace = json.data;
            status.text(myName);
            var position = myRace.dataY*19 + myRace.dataX;
            $('div[class='+position+']').css('background-color','green');
//            input.removeAttr('disabled').focus();
        }
        // 메시지가 입력됐을 때
        else if (json.type === 'message') { // it's a single message
            input.removeAttr('disabled'); // let the user write another message
            addMessage(json.data.author, json.data.text,
                       json.data.color, new Date(json.data.time));
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this: ', json);
        }
    };

    /**
     * Send mesage when user presses Enter key
     */

    $('#input').keydown(function(e) {
        if (e.keyCode === 13) {
            var msg = {type:'utf8', utf8Data:$(this).val()};
            // send the message as an ordinary text
            connection.send(JSON.stringify(msg));
            $(this).val('');
            // disable the input field to make the user wait until server
            // sends back response
//            input.attr('disabled', 'disabled');

            // we know that the first message sent from a user their name
            if (myName === false) {
                myName = msg.utf8Data;
            }
        }
    });

    $(document).keydown(function(e) {

        if(e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode ===40){
            var dir;
            if(e.keyCode == 37)
              dir = {dataX:-1, dataY:0};
            else if(e.keyCode == 38)
              dir = {dataX:0, dataY:-1};
            else if(e.keyCode == 39)
              dir = {dataX:1, dataY:0};
            else if(e.keyCode == 40)
              dir = {dataX:0, dataY:1};

            var position = myRace.dataX+myRace.dataY*19;
            $('div[class='+position+']').css('background-color','white');

            var msg = {type:'move', dataX:dir.dataX, dataY:dir.dataY};
            connection.send(JSON.stringify({type:'remove', data:''}));
            connection.send(JSON.stringify(msg));
        }

    });

    /**
     * This method is optional. If the server wasn't able to respond to the
     * in 3 seconds then show some error message to notify the user that
     * something is wrong.
     */
    setInterval(function() {
        if (connection.readyState !== 1) {
            status.text('Error');
            input.attr('disabled', 'disabled').val('Unable to comminucate '
                                                 + 'with the WebSocket server.');
        }
    }, 3000);

    /**
     * Add message to the chat window
     */
    function addMessage(author, message, race, dt) {
        content.append(author + '</span> @ ' +
             + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
             + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
             + ': ' + message + '</p>');
    }
});
