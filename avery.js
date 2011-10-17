var path = require('path');
var mkdirp = require('mkdirp');

var express = require('express'), _ = require('underscore');

var hoard = require('hoard');
var hoardPath = "hoard_files"

//var redis = require('redis');
//var redisClient = redis.createClient();
//var redisNamespace = "avery";

function ts() { return ~~(new Date().getTime() / 1000) }
var port = process.env.PORT || 3000;

var app = express.createServer(
  express.logger(),
  express.static(__dirname + '/public')
);

app.configure(function() {
  app.set('views', __dirname + '/views'),
  app.set('view engine', 'jade'),
  app.set('view options', { layout: 'layout' })
  app.use(express.bodyParser());
  app.use(express.methodOverride());
});

// writes
app.post("/create/:key/:metric", function(req, res) {
  var time = ts();
  var hoardDirectory = path.join(".", hoardPath, req.params.key)
  var hoardFile = path.join(hoardDirectory, req.params.metric+".hoard")
  mkdirp(hoardDirectory, 0755, function (err) {
    path.exists(hoardFile, function(exists) {
      if (exists) return res.send({ success: false, error: ":key/:metric pair already created.", file: hoardFile })
      // TODO: un-hardcode archive options [ [1, 60], [10, 600] ]
      hoard.create(hoardFile, [ [1, 60], [10, 600] ], 0.5, function(err) {
        if (err) return res.send({ success: false, error: err })
        res.send({ success: true, file: hoardFile })
      })
    })
  })
});

app.post("/update/:key/:metric", function(req, res) {
  if (typeof(req.body) == "undefined" || typeof(req.body.value) == "undefined") return res.send({ success: false, error: "no value specified." })
  var value = req.body.value;
  var time = ts();
  var hoardDirectory = path.join(".", hoardPath, req.params.key)
  var hoardFile = path.join(hoardDirectory, req.params.metric+".hoard")
  path.exists(hoardFile, function(exists) {
    if (!exists) return res.send({ success: false, error: "no such :key/:metric pair. use: /create/"+req.params.key+"/"+req.params.metric, file: hoardFile })
    hoard.update(hoardFile, value, time, function(err) {
      if (err) return res.send({ success: false, error: err })
      res.send({ success: true })
    })
  })
});

app.post("/updateMany/:key/:metric", function(req, res) {
  return res.send({ success: false, error: "this feature is not yet implemented. use: /update/"+req.params.key+"/"+req.params.metric })
  var value = req.body.value;
  var time = ts();
  var values = [ [time, value], [time, value*2] ];
  var hoardDirectory = path.join(".", hoardPath, req.params.key)
  var hoardFile = path.join(hoardDirectory, req.params.metric+".hoard")
  path.exists(hoardFile, function(exists) {
    if (!exists) return res.send({ success: false, error: "no such :key/:metric pair. use: /create/"+req.params.key+"/"+req.params.metric, file: hoardFile })
    hoard.updateMany(hoardFile, values, function(err) {
      if (err) return res.send({ success: false, error: err })
      res.send({ success: true })
    })
  })
});

// reads
app.get("/fetch/:key/:metric", function(req, res) {
  var time = ts();
  var hoardDirectory = path.join(".", hoardPath, req.params.key)
  var hoardFile = path.join(hoardDirectory, req.params.metric+".hoard")
  var offset = req.query.offset ? time-req.query.offset : time-60;
  path.exists(hoardFile, function(exists) {
    if (!exists) return res.send({ success: false, error: "no such :key/:metric pair. use: /create/"+req.params.key+"/"+req.params.metric, file: hoardFile })
    hoard.fetch(hoardFile, offset, time, function(err, timeInfo, values) {
      if (err) return res.send({ success: false, error: err })
      res.send({ success: true, ts: time, timeInfo: timeInfo, values: values })
    })
  })
});

app.get("/", function(req, res) {
  res.render('avery')
});

app.listen(port, function() {
  console.log("Listening on " + port)
});