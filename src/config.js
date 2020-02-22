const fs = require('fs');

var Config = {};

Config.password = process.env.NFC_PASSWORD || '';

// is a file?
if (Config.password.substr(0, 1) === '@') {
    var passwordFilename = Config.password.substr(1);
    console.log('Loading password from ' + passwordFilename);
    Config.password = fs.readFileSync(passwordFilename, 'utf8').trim();
}

Config.pictureDir = __dirname + '/../pictures/';

module.exports.Config = Config;
