const { server, io } = require('./server.js');

var fs = require('fs');
var gphoto2 = require('gphoto2');
var GPhoto = new gphoto2.GPhoto2();
var slugify = require('slugify');

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

        // List photos
        websocket.on('photo:list', async (data, ack) => {

            let items = await getExistingPictures();
            ack({
                files: items
            });
        });

        // List photos
        websocket.on('photo:remove', async (data, ack) => {
            if (typeof(data.file) === 'undefined') {
                ack({
                    error: {
                        message: 'No filename provided.'
                    }
                });
                return;
            }

            if (data.file[0] === '.' || data.file[0] === '/' || data.file[0] === '\\') {
                ack({
                    error: {
                        message: 'No filename provided.'
                    }
                });
                return;
            }

            var file = Config.pictureDir + data.file;
            console.log('Removing ', file);

            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                ack({
                    okay: true
                });
            }
        });

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
                        console.error(er);
                        return;
                    }

                    let pathName = name + '-' + getImageIdentifier() + '.jpg';
                    fs.writeFileSync(Config.pictureDir + pathName, data);

                    ack({
                        file: 'images/' + pathName
                    });

                });
            } catch (e) {
                console.error(e);
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

function getExistingPictures() {
    return new Promise(
        (resolve, reject) => {

            fs.readdir(Config.pictureDir, (err, files) => {

                resolve(files.filter((item) => {
                    if (item[0] === '.') {
                        return false;
                    }

                    if (item === 'counter') {
                        return false;
                    }

                    if (item.substr(-3) === 'jpg') {
                        return true;
                    }

                    return false;
                }).map((item) => {
                    return {
                        file: 'images/' + item,
                        name: item.substr(0, item.indexOf('-'))
                    };
                })
            );
        });
    });
}

checkForCamera();
//getExistingPictures().then(console.log);
//exports.controller = controller;
