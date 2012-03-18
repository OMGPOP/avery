var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var _ = require('underscore');
var hoard = require('hoard');
var hoardPath = "hoard_files"

function ts() { return ~~((+new Date()) / 1000) }

var redis = require('redis');
var redisClient = redis.createClient();
//var redisClientBuffer = redis.createClient(6379, '0.0.0.0', { return_buffers:true });

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

function population32(a){a-=a>>1&1431655765;a=(a>>2&858993459)+(a&858993459);a=(a>>4)+a&252645135;a+=a>>8;return a+(a>>16)&63};
function populationBuffer(c){for(var d=0,a=0,b=0;b<c.length;b+=4)a=c[b],a+=c[b+1]<<8,a+=c[b+2]<<16,a+=c[b+3]<<24,d+=population32(a);return d};

//function updateAu() {
//  redisClientBuffer.get("avery::au::dst_free::", function(err, reply) {
//    console.log(populationBuffer(reply))
//    
//  })
//}

setInterval(function() { updateIncrMetrics() }, 10000)
//setInterval(function() { updateHai() }, 2000)