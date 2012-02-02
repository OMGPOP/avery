var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var exec = require('child_process').exec;

var express = require('express'), _ = require('underscore');

var hoard = require('hoard');
var hoardPath = "hoard_files"

function ts() { return ~~((+new Date()) / 1000) }

function normalizeArray(metrics) {
  var maxLength = _.reduce(metrics, function(max, metric){ return (metric.length > max ? metric.length : max); }, 0);
  var result = [];
  metrics.forEach(function(metric) {
    if (metric.length == maxLength) {
      result.push(metric)
    } else {
      var tempMetric = [];
      metric.forEach(function(number) {
        tempMetric.push(_.map(new Array((maxLength / metric.length) + 1).join(number + " ").split(" ").splice(0,(maxLength / metric.length)), function(x) { return Number(x) }));
      })
      result.push(_.flatten(tempMetric));
    }
  })
  return _.map(_.zip.apply([], result), function(numbers) { return ~~(_.reduce(numbers, function(one,two) { return Number(one||0)+Number(two||0) })) });
}

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

var redis = require('redis');
var redisClient = redis.createClient();
app.get("/incr/:key/:metric", function(req, res) {
  var key = req.params.key;
  if (typeof(key) == "undefined") return res.send({ success: false, error: "Invalid key." })
  var metric = req.params.metric;
  if (typeof(metric) == "undefined") return res.send({ success: false, error: "Invalid metric." })
  var redisKey = "avery::metrics::"+key+"::"+metric;
  redisClient.incr(redisKey, function(err, value) {
    if (err) return res.send({ success: false, error: err })
    redisClient.sadd("avery::metrics", JSON.stringify({ key: key, metric: metric }), function(err, reply) {
      if (err) return res.send({ success: false, error: err })
      res.send({ success: true, key: key, metric: metric, value: value })
    })
  })
})
app.get("/get/:key/:metric", function(req, res) {
  var key = req.params.key;
  if (typeof(key) == "undefined") return res.send({ success: false, error: "Invalid key." })
  var metric = req.params.metric;
  if (typeof(metric) == "undefined") return res.send({ success: false, error: "Invalid metric." })
  var redisKey = "avery::metrics::"+key+"::"+metric;
  redisClient.get(redisKey, function(err, value) {
    if (err) return res.send({ success: false, error: err })
    res.send({ success: true, key: key, metric: metric, value: value })
  })
})


function updateMetrics() {
  var time = ts();
  redisClient.smembers("avery::metrics", function(err, metrics) {
    _.each(metrics, function(metric) {
      var metric = JSON.parse(metric)
      var redisKey = "avery::metrics::"+metric['key']+"::"+metric['metric'];
      var redisKeyLast = redisKey+"::last"
      redisClient.multi().get(redisKey).get(redisKeyLast).smove("avery::metrics", "avery::metrics_completed", redisKey).exec(function(err, reply) {
        var now = Number(reply[0]);
        var last = Number(reply[1]);
        var value = now - last;
        redisClient.set(redisKeyLast, now)
        var hoardDirectory = path.join(".", hoardPath, metric['key'])
        var hoardFile = path.join(hoardDirectory, metric['metric']+".hoard")
        path.exists(hoardFile, function(exists) {
          if (!exists) {
            mkdirp(hoardDirectory, 0755, function (err) {
              path.exists(hoardFile, function(exists) {
                hoard.create(hoardFile, [ [ 60, 1440 ], [ 600, 1008 ], [ 3600, 720 ], [ 86400, 720 ] ], 0.5, function(err) {
                  if (err) return console.log(err)
                  hoard.update(hoardFile, value, time, function(err) {
                    if (err) return console.log(err)
                    console.log("updated "+hoardFile+" "+value)
                  })
                })
              })
            })
          } else {
            hoard.update(hoardFile, value, time, function(err) {
              if (err) return console.log(err)
              console.log("updated "+hoardFile+" "+value)
            })
          }
        })
      })
    })
  })
}
setInterval(function() { updateMetrics() }, 60000)

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

app.get("/fetch/:key/:metric", function(req, res) {
  var time = ts();
  var endTime = req.query.offset ? time-req.query.offset : time;
  var startTime = req.query.range ? endTime-req.query.range : endTime-86400;
  var hoardDirectory = path.join(".", hoardPath, req.params.key)
  var hoardFile = path.join(hoardDirectory, req.params.metric+".hoard")
  res.header('Access-Control-Allow-Origin','*');
  path.exists(hoardFile, function(exists) {
    if (!exists) return res.send({ success: false, error: "no such :key/:metric pair." })
    hoard.fetch(hoardFile, startTime, endTime, function(err, timeInfo, values) {
      if (err) return res.send({ success: false, error: err })
      res.send({ success: true, startTime: startTime, endTime: endTime, key: req.params.key, metric: req.params.metric, values: _.map(values, function(value) { return ~~(Number(value)) }) })
    })
  })
});

app.get("/fetchMany", function(req, res) {
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
            result['metrics'].push({ metric: metric.key+"/"+metric.metric, values: _.map(values, function(value) { return Number(value) }) })
            getMetrics(x+1)
          })
        })
      }
    } else {
      result['metrics'] = [ { metric: 'all/'+metrics[0]['metric'], values: normalizeArray(_.pluck(result['metrics'], 'values')) } ];
      res.send(result)
    }
  }
  getMetrics(0)
});

// route to real-time updating graph
app.get("/watch/:key/:metric", function(req, res) {
  var range = req.query.range||86400;
  var offset = req.query.offset||0;
  res.render('watch', { range: range, offset: offset, metrics: [ req.params.key+"/"+req.params.metric ] })
});


// hacked this together for easy browsing of keys/metrics.
app.get("/:key", function(req, res) {
  var hoardDirectory = path.join(".", hoardPath, req.params.key)
  var response = '<html><head></head><body><h1>'+req.params.key+'</h1>';
  path.exists(hoardDirectory, function(exists) {
    if (!exists) {
      response += '<div>no such directory</div>'
      return res.send(response)
    }
    fs.readdir(hoardDirectory, function(err, files) {
      if (err) {
        response += '<div>error reading from directory</div>'
        return res.send(response)
      }
      files.forEach(function(file) {
        file = path.basename(file, '.hoard')
        response += '<div><a href=/watch/'+req.params.key+'/'+file+'>'+req.params.key+'/'+file+'</a>';
      })
      res.send(response)
    })
  })
});

app.get("/", function(req, res) {
  fs.readdir(hoardPath, function(err, files) {
    var response = '<html><head></head><body>';
    files.forEach(function(file) {
      response += '<div><a href=/'+file+'>'+file+'</a>';
    })
    res.send(response)
  })
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port)
});