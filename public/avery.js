var Avery = {
  watch: function($element, metrics) {
    $.getJSON("/fetch", { offset: 600, metrics: metrics }, function(x) {
      var stacked = metrics.length == 1 ? x['metrics'][0]['values'] : _.map(_.zip.apply([], _.pluck(x['metrics'], 'values')), function(c) { return _.reduce(c, function(d,e) { return Number(d)+Number(e) }) })
      $element.sparkline(stacked, { height:'50px', type: 'line', fillColor: '#DDDDDD', lineColor: '#03ACE3', lineWidth: 2, chartRangeMin: 0, chartRangeMax: 5 })
    })
  }
}