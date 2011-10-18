var Avery = {
  watch: function($chart, $chartData, range, offset, metrics) {
    var metrics = [ "n142.gn.omgpop.com/gn_total" ]
    $.getJSON("http://i.love.dudez.me:5000/fetch", { range: range, offset: offset, metrics: metrics }, function(x) {
      $chartData.html("")
      var stacked = metrics.length == 1 ? x['metrics'][0]['values'] : _.map(_.zip.apply([], _.pluck(x['metrics'], 'values')), function(c) { return _.reduce(c, function(d,e) { return Number(d)+Number(e) }) })
      $chart.sparkline(stacked, { height:'250px', width: '500px', type: 'line', fillColor: '#DDDDDD', lineColor: '#03ACE3', lineWidth: 1, chartRangeMin: 0 })
      console.log(metrics)
    })
  }
}