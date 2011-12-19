var Avery = {
  watch: function($chart, $chartData, range, offset, metrics) {
    $.getJSON("/fetchMany", { range: range, offset: offset, metrics: metrics }, function(x) {
      $chartData.html("")
      // TODO: occasionally metrics are returned with different sample sizes (144 vs 1440), need to account for this.
      //       for now, we're just doing this on the backend.
      $chart.sparkline(x['metrics'][0]['values'], { height:'250px', width: '500px', type: 'line', fillColor: '#DDDDDD', lineColor: '#03ACE3', lineWidth: 2, spotRadius: 3, chartRangeMin: 0, spotColor: "#000", minSpotColor: "#000", maxSpotColor: "#000" })
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
            $('<td>').html(String(~~(_.min(_.compact(metric['values'])))).replace("Infinity","0")),
            $('<td>').html(String(~~(_.max(_.compact(metric['values'])))).replace("-Infinity","0")),
            $('<td>').html(String(~~(_.last(metric['values'])||0)))
          )
        )
      })
      if (metrics.length > 1) {
        $chartDataTable.append(
          $('<tr>').append(
            $('<th>').css("text-align","right").html("total"),
            $('<th>').css("text-align","right").html(String(~~(_.min(_.compact(stacked)))).replace("Infinity","0")),
            $('<th>').css("text-align","right").html(String(~~(_.max(_.compact(stacked)))).replace("-Infinity","0")),
            $('<th>').css("text-align","right").html(String(~~(_.last(stacked))))
          )
        )
      }
      $chartData.html($chartDataTable)
    })
  }
}