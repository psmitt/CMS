function loadView(file) {
  let $footer = $('main>section>footer')
  $footer.empty()
  fs.readFile(file, 'utf8', (error, xmlString) => {
    if (error) throw error
    const xmlDoc = xmlString.charCodeAt(0) === 0xFEFF ? // BOM
      $.parseXML(xmlString.substring(1)) : $.parseXML(xmlString)
    $footer.append(`<h1><span title="${$(xmlDoc).find('view').attr('title')}">${$(xmlDoc).find('view').attr('title')}</span></h1>`)
    $footer.append('<table><colgroup></colgroup><thead></thead><tbody></tbody></table>')
    let $columns = $(xmlDoc).find('column')
    let $queries = $(xmlDoc).find('query')
    let colWidths
    if ($queries.length > 1) { // gap analysis
      $('footer colgroup').append(`
        ${'<col width="200"/>'.repeat(2)}
        ${'<col width="300"/>'.repeat(2)}
      `)
      $('footer thead').append(`
        <tr>${'<th><input type="search"></th>'.repeat(4)}</tr>
        <tr>
          <td>${$columns[0].getAttribute('title')}</td>
          <td data-title="Data">Data</td>
          <td>${$queries[0].getAttribute('title')}</td>
          <td>${$queries[1].getAttribute('title')}</td>
        </tr>
      `)
    } else {
      mysql_pool.getConnection((error, cmdb) => {
        if (error) throw error
        $('footer thead').append(`<tr>${'<th><input type="search"></th>'.repeat($columns.length)}</tr>`)
        let titleRow = document.createElement('tr')
        $columns.each(function () {
          $(titleRow).append(`<td>${$(this).attr('title')}</td>`)
        })
        $('footer thead').append(titleRow)
        cmdb.query($queries.text(), (error, result, fields) => {
          if (error) throw error
          for (let row of result) {
            let dataRow = document.createElement('tr')
            for (let data in row) {
              $(dataRow).append(`<td>${row[data]}</td>`)
            }
            $('footer tbody').append(dataRow)
          }
          cmdb.release();
        })
      })
      $columns.each(function () {})
    }
  })
}