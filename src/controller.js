const { server, io } = require('./server.js');

var fs = require('fs');
var gphoto2 = require('gphoto2');
var GPhoto = new gphoto2.GPhoto2();
var slugify = require('slugify')

const { Config } = require('./config');

let websocket;
let globalCamera;

console.log('Password: ', Config.password);

io.on('connection', function(socket){
    console.log('a user connected');

    websocket = socket;

    // first make sure a password is provided.
    websocket.once('hello', (data, ack) => {

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

            if (!globalCamera) {
                ack({
                    error: 'No camera detected.'
                });
                return;
            }

            let name = 'image-';
            if (typeof(data.name) !== 'undefined') {
                name = slugify(data.name);
            }

            let keep = typeof(data.keep) !== 'undefined' ? !!data.keep : false;

            // Take picture with camera object obtained from list()
            console.log('Taking picture', name);

            try {
                globalCamera.takePicture({
                    download: true,
                    keep: keep
                }, function (er, data) {

                    if (er) {
                        ack({
                            error: er.message
                        });
                        return;
                    }

                    let pathName = name + '-' + getImageIdentifier() + '.jpg';
                    fs.writeFileSync(Config.pictureDir + pathName, data);

                    ack({
                        file: 'images/' + pathName
                    });

                });
            } catch (e) {
                checkForCamera();
                ack({
                    error: e.message
                });
            }
        });

    });

});

function pad(num, size) {
    var s = "0000" + num;
    return s.substr(s.length-size);
}

function checkForCamera() {
    console.log('Looking for camera');
    GPhoto.list((list) => {
        if (list.length === 0) {
            globalCamera = null;
            return;
        }

        var camera = list[0];
        console.log('Found', camera.model);

        // get configuration tree
        /*
        camera.getConfig(function (er, settings) {
            console.log(settings);
        });
         */

        globalCamera = camera;
    });
}

function getImageIdentifier() {
    let counterFilename = Config.pictureDir + 'counter';
    let counter = 0;

    try {
        counter = fs.readFileSync(counterFilename);
    } catch (e) {

    }

    counter ++;
    fs.writeFileSync(counterFilename, counter);

    return pad(counter, 4);
}

checkForCamera();
//exports.controller = controller;
