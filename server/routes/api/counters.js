const Counter = require('../../models/Counter');
var fs = require('fs');
var formidable = require('formidable');
var shortid = require('shortid');

module.exports = (app, io) => {
  app.post('/upload', function(req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req);

    form.on('fileBegin', function (name, file){
      console.log(file);
      file.path = './audio_files/' + shortid.generate() + '.mp3';
    });

    form.on('file', function (name, file){
      console.log('Uploaded ' + file.name);
    });

    res.send('File uploaded!');
  });

  io.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
      console.log(data);
    });
  });


  app.get('/get', function(req, res) {
    const testFolder = './audio_files/';

    fs.readdir(testFolder, (err, files) => {
      res.send(files);
    })
  });
};


function move(oldPath, newPath, callback) {

  fs.rename(oldPath, newPath, function (err) {
    if (err) {
      if (err.code === 'EXDEV') {
        copy();
      } else {
        callback(err);
      }
      return;
    }
    callback();
  });

  function copy() {
    var readStream = fs.createReadStream(oldPath);
    var writeStream = fs.createWriteStream(newPath);

    readStream.on('error', callback);
    writeStream.on('error', callback);

    readStream.on('close', function () {
      fs.unlink(oldPath, callback);
    });

    readStream.pipe(writeStream);
  }
}
