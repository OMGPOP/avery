Avery
==========================

Avery is a real-time time-based metric storage, retrieval, and graphing service.

Goals
------
* Web-service
* Generalized for any type of metrics
* RRD-style Data Structure (Time series data)
* Real-time accessibility
* Wizard for creating data structures
* JSON/PNG Export
* Pretty colors

This project aims to duplicate basic RRD functionality via a node.js back-end and a Redis data-store.

Web-service
-----------
* NodeJS
* Redis data-store

RRD-style Data Structure (Time series data)
-------------------------------------------
* Steps
* DS (Counter / Gauge)
* RRA
* Example from RRD:

		rrdtool create temperature.rrd --step 300 \
			DS:temp:GAUGE:600:-273:5000 \
			RRA:AVERAGE:0.5:1:1200 \
			RRA:MIN:0.5:12:2400 \
			RRA:MAX:0.5:12:2400 \
			RRA:AVERAGE:0.5:12:2400
			
    	This sets up an RRD called temperature.rrd which accepts one temperature value every 300 seconds. If no new data is supplied for more than 600 seconds, the temperature becomes *UNKNOWN*. The minimum acceptable value is -273 and the maximum is 5'000.  

    	A few archive areas are also defined. The first stores the temperatures supplied for 100 hours (1'200 * 300 seconds = 100 hours). The second RRA stores the minimum temperature recorded over every hour (12 * 300 seconds = 1 hour), for 100 days (2'400 hours). The third and the fourth RRA's do the same for the maximum and average temperature, respectively.

Real-time accessibility
-----------------------
* Socket.IO
* Redis Publish/Subscribe if needed

Wizard for creating data structures
-----------------------------------

1. Resolution (Steps)
2. Data stores (DS)
3. Data archiving rules (DAR)


JSON/PNG Export
---------------
* JSON API
* Canvas.toDataURL("image/png")

Pretty colors
-------------
* red
* green
* blue
* shades of gray