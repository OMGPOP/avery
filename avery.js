var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var exec = require('child_process').exec;

var express = require('express'), _ = require('underscore');

var hoard = require('hoard');
var hoardPath = "hoard_files"

function ts() { return ~~((+new Date()) / 1000) }
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
      hoard.create(hoardFile, [ [ 60, 1440 ], [ 600, 1008 ], [ 3600, 720 ], [ 86400, 720 ] ], 0.5, function(err) {
        if (err) return res.send({ success: false, error: err })
        res.send({ success: true, file: hoardFile })
      })
    })
  })
});

app.post("/update/:key/:metric", function(req, res) {
  if (typeof(req.body) == "undefined" || typeof(req.body.value) == "undefined") return res.send({ success: false, error: "no value specified." })
  var autocreate = req.body.autocreate||false;
  var value = req.body.value;
  var time = ts();
  var hoardDirectory = path.join(".", hoardPath, req.params.key)
  var hoardFile = path.join(hoardDirectory, req.params.metric+".hoard")
  path.exists(hoardFile, function(exists) {
    if (!exists) {
      if (autocreate == 'true') {
        mkdirp(hoardDirectory, 0755, function (err) {
          path.exists(hoardFile, function(exists) {
            hoard.create(hoardFile, [ [ 60, 1440 ], [ 600, 1008 ], [ 3600, 720 ], [ 86400, 720 ] ], 0.5, function(err) {
              if (err) return res.send({ success: false, error: err })
              return res.send({ success: true, autocreated: true })
            })
          })
        })
      } else {
        return res.send({ success: false, error: "no such :key/:metric pair. use: /create/"+req.params.key+"/"+req.params.metric+" or specify autocreate=true.", file: hoardFile })
      }
    } else {
      hoard.update(hoardFile, value, time, function(err) {
        if (err) return res.send({ success: false, error: err })
        res.send({ success: true })
      })
      
    }
  })
});

app.post("/updateMany/:key", function(req, res) {
  var autocreate = req.body.autocreate||false;
  var metrics = JSON.parse(req.body.metrics);
  var time = ts();
  var responses = [];
  function updateMetrics(x) {
    if (x < metrics.length) {
      var metric = metrics[x]['metric'];
      var value = metrics[x]['value'];
      var hoardDirectory = path.join(".", hoardPath, req.params.key)
      var hoardFile = path.join(hoardDirectory, metric+".hoard")
      path.exists(hoardFile, function(exists) {
        if (!exists) {
          if (autocreate == 'true') {
            mkdirp(hoardDirectory, 0755, function (err) {
              path.exists(hoardFile, function(exists) {
                hoard.create(hoardFile, [ [ 60, 1440 ], [ 600, 1008 ], [ 3600, 720 ], [ 86400, 720 ] ], 0.5, function(err) {
                  if (err) return res.send({ success: false, error: err })
                  hoard.update(hoardFile, value, time, function(err) {
                    if (err) return res.send({ success: false, error: err })
                    responses.push({ success: true, autocreated: true })
                    updateMetrics(x+1)
                  })
                })
              })
            })
          } else {
            return res.send({ success: false, error: "no such :key/:metric pair. use: /create/"+req.params.key+"/"+req.params.metric+" or specify autocreate=true.", file: hoardFile })
          }
        } else {
          hoard.update(hoardFile, value, time, function(err) {
            if (err) return res.send({ success: false, error: err })
            responses.push({ success: true })
            updateMetrics(x+1)
          })
        }
      })
    } else {
      return res.send(responses)
    }
  }
  updateMetrics(0);
});

// reads
app.get("/fetch", function(req, res) {
  if (!req.query.metrics) return res.send({ success: false, error: "must specify query string metrics" })
  var time = ts();
  var endTime = req.query.offset ? time-req.query.offset : time;
  var startTime = req.query.range ? endTime-req.query.range : endTime-86400;
  var metrics = typeof(req.query.metrics) == "string" ? [ req.query.metrics ] : req.query.metrics;
  metrics = _.map(metrics, function(metric) { return { key: metric.split("/")[0], metric: metric.split("/")[1] } });
  res.header('Access-Control-Allow-Origin','*');
  var result = { success: true, ts: time, metrics: [] };
  function getMetrics(x) {
    if (x < metrics.length) {
      var metric = metrics[x];
      if (metric.key == "all") {
        exec("find "+hoardPath+" -name '"+metric.metric+"*.hoard'", function(err, stdout, stderr) {
          var allMetrics = _.map(_.compact(stdout.split('\n')), function(hoardFile) { return path.dirname(hoardFile).replace(hoardPath+"/","")+"/"+path.basename(hoardFile, '.hoard') });
          allMetrics.forEach(function(allMetric) {
            metrics.push({ key: allMetric.split("/")[0], metric: allMetric.split("/")[1] })
          })
          getMetrics(x+1)
        })
      } else {
        var hoardDirectory = path.join(".", hoardPath, metric.key)
        var hoardFile = path.join(hoardDirectory, metric.metric+".hoard")
        path.exists(hoardFile, function(exists) {
          if (!exists) return res.send({ success: false, error: "no such :key/:metric pair. use: /create/"+metric.key+"/"+metric.metric, file: hoardFile })
          hoard.fetch(hoardFile, startTime, endTime, function(err, timeInfo, values) {
            if (err) return res.send({ success: false, error: err })
            result['metrics'].push({ metric: metric.key+"/"+metric.metric, values: _.map(values, function(value) { return value == null ? 0 : value }) })
            getMetrics(x+1)
          })
        })
      }
    } else {
      result['metrics'].forEach(function(metric) {
        console.log(_.pluck(metric, 'values'));
      })
      result['metrics'] = result['metrics'].length == 1 ? result['metrics'] : [ { metric: 'all/'+metrics[0]['metric'], values: _.compact(_.map(_.zip.apply([], _.pluck(result['metrics'], 'values')), function(c) { return _.reduce(c, function(d,e) { return Number(d||0)+Number(e||0) }) })) } ];
      res.send(result)
    }
  }
  getMetrics(0)
});

//app.get("/watch/:key/:metric", function(req, res) {
//  var range = req.query.range||86400;
//  var offset = req.query.offset||0;
//  res.render('watch', { range: range, offset: offset, metrics: [ req.params.key+"/"+req.params.metric ] })
//});
//
//app.get("/:key", function(req, res) {
//  var hoardDirectory = path.join(".", hoardPath, req.params.key)
//  path.exists(hoardDirectory, function(exists) {
//    fs.readdir(hoardDirectory, function(err, files) {
//      var response = '<html><head></head><body><h1>'+req.params.key+'</h1>';
//      files.forEach(function(file) {
//        file = path.basename(file, '.hoard')
//        response += '<div><a href=/watch/'+req.params.key+'/'+file+'>'+req.params.key+'/'+file+'</a>';
//      })
//      res.send(response)
//    })
//  })
//});
//
//app.get("/", function(req, res) {
//  fs.readdir(hoardPath, function(err, files) {
//    var response = '<html><head></head><body>';
//    files.forEach(function(file) {
//      response += '<div><a href=/'+file+'>'+file+'</a>';
//    })
//    res.send(response)
//  })
//});

app.listen(port, function() {
  console.log("Listening on " + port)
});