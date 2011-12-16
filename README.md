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

Where did the name Avery come from? "real-time time-based metric storage, retrieval, and graphing service" or RTTBMSRAGS for short, was **a very** long name.