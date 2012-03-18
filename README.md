Avery
==========================

Avery is a real-time time-based metric storage, retrieval, and graphing service.

Goals
------
* Web-service
* Generalized for any type of metric
* Real-time accessibility
* RRD-style Data Structure (Time series data)
* Wizard for creating data structures (TODO)
* JSON/PNG Export (TODO)
* Pretty colors (TODO)

Web-service
-----------
* NodeJS
* Hoard data-storage

RRD-style Data Structure (Time series data)
-------------------------------------------
* see Hoard for more details - https://github.com/cgbystrom/hoard
* Note: as of writing this the master branch has not included many changes contributed by OMGPOP - https://github.com/OMGPOP/hoard

Example Usage
-------------
    # npm install
    # foreman start
    # curl -d "value=20" -d "autocreate=true" localhost:5000/update/localhost/example
    # open http://localhost:5000/watch/localhost/example
    
Example Graph
-------------
This is an example of a 30 minute time slice with 1 second updates (note how metric updates as applications report data).

![avery example](http://staticcdn.iminlikewithyou.com/backend/avery/avery-animated.gif)

Warning
-------
Avery is still in active development.

deleting spikes
---------------

find the spot.

var hoard = require('hoard');
var time = 1330719540;
var directory = "hoard_files/dst_paid/";
var filename = "instl.hoard";
hoard.fetch(directory+filename, time, time+240, function(err, timeInfo, values) {
  console.log(values);
})


update the files.

var hoard = require('hoard');
var time = 1330719740;
var directory = "hoard_files/dst_paid/";
require("fs").readdirSync(directory).filter(function(file){ return file.match(/^[^_].*\.hoard$/) }).forEach(function(filename) { 
  hoard.fetch(directory+filename, time, time+240, function(err, timeInfo, values) {
    if (values[1] != null) {
      hoard.update(directory+filename, values[1], time+60, function(err) {
        if (err) console.log(err)
        console.log("updated",filename,"from",values[0],"to",values[1])
      })
    }
  })
})


---
Where did the name Avery come from? "real-time time-based metric storage, retrieval, and graphing service" or RTTBMSRAGS for short, was **a very** long name.