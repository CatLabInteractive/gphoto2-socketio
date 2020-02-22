const { server, io } = require('./server.js');

const { Config } = require('./config');

let websocket;

console.log('Password: ', Config.password);

io.on('connection', function(socket){
    console.log('a user connected');

    websocket = socket;

    // first make sure a password is provided.
    websocket.on('hello', (data, ack) => {

        ack = ack || function() {};

        // check if the password is correct
        if (typeof(data.password) === 'undefined' || data.password !== Config.password) {
            ack({ error: { message: 'Password is wrong.' }});
            return;
        }

        ack({ success: true });

        // Now listen for commands.
        websocket.on('photo:takePicture', async (data, ack) => {

            ack = ack || function() {};


        });

    });

});



//exports.controller = controller;
