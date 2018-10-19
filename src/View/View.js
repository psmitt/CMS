function loadView(file) {
  let $footer = $('main>section>footer')
  $footer.empty()
  fs.readFile(file, 'utf8', (error, xmlString) => {
    if (error) throw error
    const xmlDoc = xmlString.charCodeAt(0) === 0xFEFF ? // BOM
      $.parseXML(xmlString.substring(1)) : $.parseXML(xmlString)
    $footer.append(`<h1>${$(xmlDoc).find('view').attr('title')}</h1>`)
    $footer.append('<table><thead></thead><tbody><tbody></table>')
    let $columns = $(xmlDoc).find('column')
    let $queries = $(xmlDoc).find('query')
    if ($queries.length > 1) { // gap analysis
      $('thead').append(`
        <tr>${'<th><input type="search"></th>'.repeat(4)}</tr>
        <tr>
          <th>${$columns[0].getAttribute('title')}</th>
          <th data-title="Data">Data</th>
          <th>${$queries[0].getAttribute('title')}</th>
          <th>${$queries[1].getAttribute('title')}</th>
        </tr>
      `)
    } else {
      console.log($queries.text());
      cmdb.connect(error => {
        if (error) throw error
        $('thead').append(`<tr>${'<th><input type="search"></th>'.repeat($columns.length)}</tr>`)
        let titleRow = document.createElement('tr')
        $columns.each(function () {
          $(titleRow).append(`<th>${$(this).attr('title')}</th>`)
        })
        $('thead').append(titleRow)
        cmdb.query($queries.text(), (error, result, fields) => {
          if (error) throw error
          for (let row of result) {
            let dataRow = document.createElement('tr')
            for (let data in row) {
              $(dataRow).append(`<td>${row[data]}</td>`)
            }
            $('tbody').append(dataRow)
          }
        })
      })
      $columns.each(function () {})
    }
  })
}