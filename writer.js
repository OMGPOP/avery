var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var _ = require('underscore');
var hoard = require('hoard');
var hoardPath = "hoard_files"

function ts() { return ~~((+new Date()) / 1000) }

var redis = require('redis');
var redisClient = redis.createClient();

function updateIncrMetrics() {
  var time = ts();
  redisClient.smembers("avery::metrics", function(err, metrics) {
    _.each(metrics, function(metricString) {
      var redisKey = "avery::metrics::"+metricString;
      var redisKeyLast = redisKey+"::last";
      redisClient.multi().get(redisKey).get(redisKeyLast).smove("avery::metrics", "avery::metrics_completed", metricString).exec(function(err, reply) {
        var now = Number(reply[0]);
        var last = Number(reply[1]);
        var value = now - last;
        redisClient.set(redisKeyLast, now)
        var key = metricString.split("::")[0]
        var metric = metricString.split("::")[1]
        var hoardDirectory = path.join(".", hoardPath, key)
        var hoardFile = path.join(hoardDirectory, metric+".hoard")
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

setInterval(function() { updateIncrMetrics() }, 60000)