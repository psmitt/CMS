const mysql = require('mysql')
const md5 = require('md5')

ipc.on('Change Database', _ => (changeDatabase()))

function changeDatabase(server) {
  if (!server)
    server = prompt("Please enter the name of MySQL database server", "Server Name:");
  if (server)
    fs.writeFileSync(path.join(os.homedir(), '.cms', 'lastDatabase.txt'), server, 'utf8')
  mysql_pool = mysql.createPool({
    "host": server,
    "database": rootDir,
    "user": `${rootDir}_Admin`,
    "password": md5(`${rootDir}_Admin`),
    "supportBigNumbers": true,
    "multipleStatements": true
  })
}

function SQL($input, $output, $dsn = '', $user = '', $pass = '') {
  if (!$dsn || !$user || !$pass) { // MySQL queries
    mysql_pool.getConnection((error, cmdb) => {
      if (error) throw error
      cmdb.query({
        sql: $input,
        nestTables: '.'
      }, (error, result, fields) => {
        if (error) throw error
        for (let row of result[result.length - 1]) {
          let dataRow = []
          for (let data in row) {
            if (row[data]) {
              if (row[data] instanceof Date)
                dataRow.push(row[data].toISOString().substring(0, 10))
              else
                dataRow.push(row[data].toString())
            } else { // null or emtpy string
              dataRow.push('')
            }
          }
          dataRow.push(true) // display
          $output.push(dataRow)
        }
        cmdb.release()
      })
    })
  }
  /*
    try {
      $attr[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
      $dbh = new PDO($dsn, $user, $pass, $attr);
      foreach($queries as $query)
      $stmt = $dbh - > query($query);
      $affected_rows = $stmt - > rowCount();
      try {
        $last_insert_id = $dbh - > lastInsertId();
      } // PostgreSQL behaviour
      catch (PDOException $exception) {
        $last_insert_id = 0;
      }
      $output = $stmt - > fetchAll(PDO::FETCH_NUM);
      $stmt - > closeCursor();
      return [$affected_rows, $last_insert_id, ''];
    } catch (PDOException $exception) {
      // trigger_error($exception->getMessage());
      // trigger_error($input);
      return [0, 0, $exception - > getMessage()];
    }
  */
}