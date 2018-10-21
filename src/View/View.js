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
      $('footer table').css('width', '1000px')
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
      let tableWidth = 0
      let titleRow = document.createElement('tr')
      $columns.each(function (i) {
        let width = $(this).attr('width')
        if (width) {
          tableWidth += parseInt(width)
          $('footer colgroup').append(`<col width="${width}">`)
        } else {
          switch ($(this).attr('type')) {
            case 'date':
            case 'time':
            case 'datetime':
            case 'number':
              tableWidth += 110
              break;
            default:
              tableWidth += 170
          }
          $('footer colgroup').append('<col width="110">')
        }
        $(titleRow).append(`<td>${$(this).attr('title')}</td>`)
        /*
        let align = $(this).attr('type') === 'number' ? 'right' : 'left'
        let font = ''
        switch ($(this).attr('type')) {
          case 'date':
          case 'time':
          case 'datetime':
            align = 'center'
          case 'number':
            font = 'font-family: monospace;'
        }
        if ($(this).attr('align')) {
          align = $(this).attr('align')
        }
        if ($(this).attr('font') === 'mono') {
          font = 'font-family: monospace;'
        }
        */
      })
      $('footer table').css('width', tableWidth + 'px')
      $('footer thead').append(`<tr>${'<th><input type="search"></th>'.repeat($columns.length)}</tr>`)
      $('footer thead').append(titleRow)
      /*
            mysql_pool.getConnection((error, cmdb) => {
              if (error) throw error
              cmdb.query({
                sql: $queries.text(),
                nestTables: '.'
              }, (error, result, fields) => {
                if (error) throw error
                for (let row of result) {
                  let dataRow = document.createElement('tr')
                  for (let data in row) {
                    if (row[data]) {
                      if (row[data] instanceof Date)
                        $(dataRow).append(`<td>${row[data].toISOString().substring(0, 10)}</td>`)
                      else
                        $(dataRow).append(`<td>${row[data]}</td>`)
                    } else { // null or emtpy string
                      $(dataRow).append('<td></td>')
                    }
                  }
                  $('footer tbody').append(dataRow)
                }
                cmdb.release();
              })
            })
      */
      mysql_pool.getConnection((error, cmdb) => {
        if (error) throw error
        cmdb.query({
            sql: $queries.text(),
            nestTables: '.'
          }).stream().pipe(require('stream').Transform({
            objectMode: true,
            transform: function (row, encoding, callback) {
              let dataRow = document.createElement('tr')
              for (let data in row) {
                if (row[data]) {
                  if (row[data] instanceof Date)
                    $(dataRow).append(`<td>${row[data].toISOString().substring(0, 10)}</td>`)
                  else
                    $(dataRow).append(`<td>${row[data]}</td>`)
                } else { // null or emtpy string
                  $(dataRow).append('<td></td>')
                }
              }
              $('footer tbody').append(dataRow)
              callback()
            }
          }))
          .on('finish', () => cmdb.release())
      })
    }
  })
}