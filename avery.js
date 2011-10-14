var express = require('express'), redis = require('redis'), _ = require('underscore');

var redisClient = redis.createClient();
var redisNamespace = "avery";

var port = process.env.PORT || 3000;

var app = express.createServer(
  express.logger(),
  express.static(__dirname + '/public')
);

app.configure(function() {
  app.set('views', __dirname + '/views'),
  app.set('view engine', 'jade'),
  app.set('view options', { layout: 'layout' })
});


app.get("/put/:key/:metric", function(req, res) {
  
  // build the event
  var ts = ~~(new Date().getTime() / 1000)
  var value = req.query.value||0;
  var key = req.params.key
  var metric = req.params.metric

  // build the redis keys
  var keys = {
    metricDS: redisNamespace+":metric:"+metric+":ds",
    metricRRAs: redisNamespace+":metric:"+metric+":rras",
    metricData: redisNamespace+":data:"+key+":"+metric,
  }
  
  redisClient.multi().hgetall(keys['metricDS']).hgetall(keys['metricRRAs']).exec(function(err, reply) {
    // place DS definition into variable
    var metricDS = reply[0];
    // we store RRA definition as JSON in the redis hash.
    var metricsRRAs = _.map(reply[1], function(rraDefinition,rra) { return { id: rra, definition: JSON.parse(rraDefinition) } })

    // error handling
    if (!metricDS['dt']||!metricDS['epoch']) return res.send({ success: false, error: "invalid metric"})
    if (!metricsRRAs[0]) return res.send({ success: false, error: "must have at least one archive"})

    // map event to destination
    var dt = Number(metricDS['dt']);
    var epoch = Number(metricDS['epoch']);
    var bucket = epoch + (~~((ts - epoch) / dt) * dt);
    
    // return success, async it to the db.
    res.send({ success: true, bucket: bucket })

    // add value to key:metric w/ ts then trim.
    _.each(metricsRRAs, function(rra) {
      redisClient.zadd(keys['metricData']+":"+rra['id'], bucket, ts+"_"+value, function(err, response) {
        redisClient.zremrangebyscore(keys['metricData']+":"+rra['id'], "-inf", "("+(bucket - (dt * Number(rra['definition']['steps']))))
      })
    })
    
  })
})

app.get("/get", function(req, res) {
  res.send({ success: true })
})

app.get("/", function(req, res) {
  res.render('avery')
});

app.listen(port, function() {
  console.log("Listening on " + port)
});