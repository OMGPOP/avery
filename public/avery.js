var Avery = {
  watch: function($element, key, metric) {
    $.getJSON("/fetch", { offset: 600, metrics: [ key+"/"+metric ] }, function(x) {
      var stack = _.map(_.zip.apply([], _.pluck(x['metrics'], 'values')), function(c) { return _.reduce(c, function(d,e) { return Number(d)+Number(e) }) })
      $element.sparkline(stack, { height:'50px', type: 'bar', fillColor: '#DDDDDD', barColor: '#03ACE3', barWidth: 10, barSpacing: 1, chartRangeMin: 0, chartRangeMax: 5 })
    })
  }
}