function assetDetails(asset_id) {
  runSQLQuery(myQuery(`
        SELECT
          IF (category_en = 'Communication', 'Kommunikáció',
            IF (category_en = 'Computing',   'Számítógép',
            IF (category_en = 'Display',     'Kijelző',
            IF (category_en = 'Network',     'Hálózat',
            IF (category_en = 'Other',       'Egyéb',
            IF (category_en = 'Paper-Based', 'Papírkezelés',
            IF (category_en = 'Power',       'Áramellátás',
            IF (category_en = 'Storage',     'Adattárolás',
            NULL)))))))),
          subcategory_hu,
          manufacturer_name,
          model,
          asset.label,
          CONCAT(signature,
            IF(LEFT(person.note, 9) = 'spec_diff',
              CONCAT(' / ', IF(LOCATE('\n', person.note),
                               MID(person.note, 12, LOCATE('\n', person.note) - 11),
                               RIGHT(person.note, CHAR_LENGTH(person.note) - 11))),
              '')),
          CONCAT_WS('\n\t\t',
            NULLIF(CONCAT_WS(' / ', site.common_name, area_or_building), ''),
            NULLIF(CONCAT_WS(' / ', wing_and_floor, room_or_place), ''),
            NULLIF(GROUP_CONCAT(DISTINCT CONCAT('::', socket.label) SEPARATOR ' '), '')
            ),
          serial_number,
          product_number,
          sap_asset_code,
          IF (asset.status = 'operational',  'üzemkész',
            IF (asset.status = 'damaged',    'hibás',
            IF (asset.status = 'to dispose', 'selejtezendő',
            IF (asset.status = 'dismissed',  'leselejtezve',
            IF (asset.status = 'to invoice', 'számlázandó',
            IF (asset.status = 'sold',       'eladva',
            IF (asset.status = 'lost',       'elveszett',
            IF (asset.status = 'to withdraw','bevonandó',
            IF (asset.status = 'withdrawn',  'bevonva',
            IF (asset.status = 'to cancel',  'kivezetendő',
            NULL)))))))))),
          GROUP_CONCAT(DISTINCT CONCAT_WS(' ', hostname, CONCAT('- ', os_ip.ip_address)) SEPARATOR '\n\t\t'),
          GROUP_CONCAT(DISTINCT CONCAT_WS(' ', asset_ip.ip_address, CONCAT('- ', asset_ip.note)) SEPARATOR '\n\t\t'),
          GROUP_CONCAT(DISTINCT CONCAT_WS(' ', mac_address, mac_note) SEPARATOR '\n\t\t'),
          owner_company.company_name,
          supplier_company.company_name,
          delivery,
          warranty,
          CONCAT_WS('\n\t\t', asset.note, configuration.note)
        FROM
          asset
            JOIN hardware ON (hardware_id = asset.hardware)
              LEFT JOIN manufacturer ON (manufacturer_id = hardware.manufacturer)
              JOIN category ON (category_id = hardware.category)
            LEFT JOIN configuration ON (asset_id = configuration.asset AND configuration.cancelled IS NULL)
              LEFT JOIN location ON (location_id = configuration.location)
                LEFT JOIN site ON (site_id = location.site)
              LEFT JOIN person ON (person_id = configuration.user)
            LEFT JOIN socket ON (socket.asset = asset_id)
            LEFT JOIN ip AS asset_ip ON (asset_ip.system_id = asset_id AND asset_ip.system_type = 'asset')
            LEFT JOIN mac ON (asset_id = mac_asset)
            LEFT JOIN os ON (asset_id = os.asset)
              LEFT JOIN ip AS os_ip ON (os_ip.system_id = os_id AND os_ip.system_type = 'os')
            LEFT JOIN company AS owner_company ON (owner_company.company_id = asset.owner)
            LEFT JOIN company AS supplier_company ON (supplier_company.company_id = asset.supplier)
        WHERE asset_id = ${asset_id}
        GROUP BY asset_id
    `), result =>
    open('', 'Eszközadatok', 'width=500,height=600,scrollbars=1').document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
</head>
<body>
<h1>Eszközinformációk</h1>
<pre>
Kategória:    <b>${result[0][0]}</b>
Típus:        <b>${result[0][1]}</b>
Gyártó:       <b>${result[0][2]}</b>
Termék:       <b>${result[0][3]}</b>
Címke:        <b>${result[0][4]}</b>
Felhasználó:  <b>${result[0][5]}</b>
Lelőhely:     <b>${result[0][6]}</b>

Sorozatszám:  <b>${result[0][7]}</b>
Termékszám:   <b>${result[0][8]}</b>
SAP szám:     <b>${result[0][9]}</b>
Státusz:      <b>${result[0][10]}</b>

Rendszerek és IP címek:

            <b>${result[0][11]}</b>

Eszköz IP címe:

            <b>${result[0][12]}</b>

Eszköz MAC címei:
            <b>${result[0][13]}</b>

Tulajdonos:   <b>${result[0][14]}</b>
Beszállító:   <b>${result[0][15]}</b>
Beszállítva:  <b>${result[0][16]}</b>
Garancia:     <b>${result[0][17]}</b>

Megjegyzések:

<b>${result[0][18]}</b>

</pre>
</body>
</html>`)
  )
}

function siteInventory(site_record, site_id, location_id) {
  site_id = site_id || (location_id ?
    `(SELECT site FROM location WHERE location_id = ${location_id})` :
    `(SELECT site_id FROM site WHERE common_name = '${site_record.data[1].match(/>(.*)</)[1]}')`)

  runSQLQuery(myQuery(
    `SELECT site_id, common_name, address
     FROM site WHERE site_id = ${site_id}`
  ), site => {
    let location = location_id ? `location = ${location_id}` : `site = ${site[0][0]}`
    let query = `SELECT area_or_building,
                 CONCAT_WS(' ', CONCAT_WS (' / ', wing_and_floor, room_or_place),
                                CONCAT('<span style=''font:italic normal 12pt Arial Narrow''>&mdash; ', location.note,'</span>')),
                 CONCAT_WS(' / ', label, serial_number),
                 CONCAT_WS(' ', manufacturer_name, model, subcategory_hu),
                 CONCAT('( ', signature, ' )'),
                 asset.status
            FROM asset
                 JOIN configuration ON (asset_id = configuration.asset AND cancelled IS NULL)
                      JOIN location ON (location_id = configuration.location)
                           JOIN site ON (site_id = location.site)
                      LEFT JOIN person ON (person_id = configuration.user)
                 JOIN hardware ON (hardware_id = asset.hardware)
                      JOIN category ON (category_id = hardware.category)
                      LEFT JOIN manufacturer ON (manufacturer_id = hardware.manufacturer)
           WHERE ${location}
           ORDER BY
                 area_or_building,
                 wing_and_floor,
                 room_or_place,
                 signature`

    runSQLQuery(myQuery(query), result => {
      let popup = open('', 'Leltári lap', 'width=999,height=600;scrollbars=1').document
      popup.write(`<!DOCTYPE html><html><head><meta charset="utf-8" />
                       <link href="View/Inventory.css" rel="stylesheet"/>
                        <title>Leltári lap</title>
                       </head>
                       <body>
                        <table>
                         <col width='25px'>
                         <col width='25px'>
                         <col width='200px'>
                         <col width='250px'>
                         <col width='*'>
                         <thead>
                          <tr><td colspan=5><img src='view/Inventory.png'/></td></tr>
                          <tr><th colspan=5>${site[0][1]}</th></tr>
                          <tr><td colspan=5><div>${site[0][2]}</div></td></tr>
                         </thead>
                         <tfoot>
                          <tr><th colspan="5"><div>
                            A felsorolt eszközök jelenlétét igazolom.
                            Tudomásul veszem, hogy a telephelyen található IT eszközök helye
                            a Duna-Dráva Cement Kft. IT osztályának jóváhagyása nélkül nem változtatható meg.
                            A felsorolt IT eszközök megőrzéséért felelősséget vállalok.
                            </div></th></tr>
                          <tr><th colspan=3><th colspan=2><div>Felelős vezető</div></th></tr>
                         </tfoot></table></body></html>`)

      let tbody = document.createElement('tbody')
      let building = ''
      let floor_room = ''

      const NEW = element => document.createElement(element)
      const ROOM = room => {
        floor_room = room
        tr = NEW('tr')
        th = NEW('th')
        th.colSpan = 4
        th.innerHTML = floor_room
        tr.appendChild(NEW('th'))
        tr.appendChild(th)
        tbody.appendChild(tr)
      }
      let trial = NEW('tr')

      for (let row of result) {
        if (building != row[0]) {
          building = row[0]
          let tr = NEW('tr')
          let th = NEW('th')
          th.colSpan = 5
          let u = NEW('u')
          u.textContent = building
          th.appendChild(u)
          tr.appendChild(th)
          tbody.appendChild(tr)

          ROOM(row[1])
        } else if (floor_room != row[1]) {
          ROOM(row[1])
        }

        let tr = NEW('tr')
        if (row[5] != 'operational')
          tr.style.color = 'red'
        let td = NEW('td')
        td.textContent = row[2]
        tr.appendChild(NEW('td'))
        tr.appendChild(NEW('td'))
        tr.appendChild(td)
        td = NEW('td')
        td.textContent = row[3]
        if (!row[4]) {
          td.colSpan = 2
        }
        tr.appendChild(td)
        if (row[4]) {
          td = NEW('td')
          td.textContent = row[4]
          tr.appendChild(td)
        }
        tbody.appendChild(tr)
      }

      popup.body.lastElementChild.appendChild(tbody)
    })
  })
}