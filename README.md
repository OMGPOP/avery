Avery
==========================

Avery is a real-time time-based metric storage, retrieval, and graphing service.

Goals
------
* Web-service
* Generalized for any type of metric
* Real-time accessibility
* RRD-style Data Structure (Time series data)
* Wizard for creating data structures
* JSON/PNG Export
* Pretty colors

This project aims to duplicate basic RRD functionality via a node.js back-end and a Redis data-store.

Web-service
-----------
* NodeJS
* Hoard data-storage

Real-time accessibility
-----------------------
* Socket.IO
* Redis Publish/Subscribe if needed

RRD-style Data Structure (Time series data)
-------------------------------------------

* see Hoard for more details - https://github.com/cgbystrom/hoard

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


Where did the name Avery come from? "real-time time-based metric storage, retrieval, and graphing service" or RTTBMSRAGS for short, was **a very** long name.