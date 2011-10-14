var express = require('express'), redis = require('redis');

var redisClient = redis.createClient();

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

app.get("/", function(req, res) {
  res.render('avery')
});

app.listen(port, function() {
  console.log("Application Listening on " + port)
});