var Avery = {
  watch: function($element, key, metric) {
    $.getJSON("/fetch/"+key+"/"+metric+"?offset=600", function(x) {
      $element.sparkline(x['values'], { height:'50px', type: 'bar', fillColor: '#DDDDDD', barColor: '#03ACE3', barWidth: 10, barSpacing: 1, chartRangeMin: 0, chartRangeMax: 5 })
    })
  }
}