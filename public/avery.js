var Avery = {
  watch: function($chart, $chartData, range, offset, metrics) {
    $.getJSON("/fetch", { range: range, offset: offset, metrics: metrics }, function(x) {
      $chartData.html("")
      var stacked = metrics.length == 1 ? x['metrics'][0]['values'] : _.map(_.zip.apply([], _.pluck(x['metrics'], 'values')), function(c) { return _.reduce(c, function(d,e) { return Number(d)+Number(e) }) })
      $chart.sparkline(stacked, { height:'250px', width: '500px', type: 'line', fillColor: '#DDDDDD', lineColor: '#03ACE3', lineWidth: 2, spotRadius: 3, chartRangeMin: 0, spotColor: "#000", minSpotColor: "#000", maxSpotColor: "#000" })
      $chartDataTable = $('<table>').css({"margin-left":"auto","margin-right":"auto"}).html(
        $('<tr>').append(
          $('<th>').html("key"),
          $('<th>').html("min"),
          $('<th>').html("max"),
          $('<th>').html("last")
        )
      )
      _.each(_.sortBy(x['metrics'], function(metric) { return _.last(metric['values'])||0 }).reverse(), function(metric) {
        $chartDataTable.append(
          $('<tr>').append(
            $('<td>').html(metric['metric'].split("/")[0]),
            $('<td>').html(~~(String(_.min(_.compact(metric['values']))).replace("Infinity","0"))),
            $('<td>').html(~~(String(_.max(_.compact(metric['values']))).replace("-Infinity","0"))),
            $('<td>').html(~~(_.last(metric['values'])||0))
          )
        )
      })
      if (metrics.length > 1) {
        $chartDataTable.append(
          $('<tr>').append(
            $('<th>').css("text-align","right").html("total"),
            $('<th>').css("text-align","right").html(~~(_.min(_.compact(stacked)).replace("Infinity","0"))),
            $('<th>').css("text-align","right").html(~~(_.max(_.compact(stacked)).replace("-Infinity","0"))),
            $('<th>').css("text-align","right").html(~~(_.last(stacked)))
          )
        )
      }
      $chartData.html($chartDataTable)
    })
  }
}