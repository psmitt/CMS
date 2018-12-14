<?php // UTF-8 without BOM

require_once 'Dispatcher.php';

foreach($_POST as $post_key => $post_value) {
    switch ($post_key) {
        case 'listDirectory':
            $filenames = [];
            foreach (glob("$xmlroot/$_SESSION[country]/$post_value/*.xml") as $path)
              $filenames[] = basename($path);
            echo json_encode($filenames);
            break;

        case 'readXMLFile':
            $bom = pack('H*','EFBBBF');
            echo preg_replace("/^$bom/", '', file_get_contents("$xmlroot/$_SESSION[country]/$post_value"));
            break;

        case 'runSQLQuery':
            $parameters = json_decode($post_value);
            if ($parameters->loadFields) {
              SQL("SHOW COLUMNS FROM $parameters->loadFields", $rows);
              foreach ($rows as $row) {
                  list($sql_type) = explode('(', $row[1]);
                  switch ($sql_type) {
                      case 'enum':
                      case 'date':
                      case 'time':
                      case 'datetime':
                          $type = $sql_type;
                          break;
                      case 'char':
                      case 'varchar':
                      case 'tinytext':
                          $type = '';
                          break;
                      case 'text':
                      case 'mediumtext':
                      case 'longtext':
                          $type = 'multiline';
                          break;
                      default:
                          $type = 'number';
                          break;
                  }
                  $field[$row[0]] = array( 'type' => $type,
                                           'required' => $row[2] == 'NO',
                                           'disabled' => $row[5] == 'auto_increment');
              }
              preg_match("/^SELECT (.*) FROM $parameters->loadFields/", $parameters->query, $matches);
              $names = explode(',', $matches[1]);
              foreach ($names as $name)
                $result_list[$name] = $field[$name];
            } else {
              if (property_exists($parameters, 'dsn'))
                $result = SQL($parameters->query, $result_list, $parameters->dsn, $parameters->user, $parameters->pass);
              else
                $result = SQL($parameters->query, $result_list);
              // Stringify all values
              $rows = count($result_list);
              if ($rows) {
                $cols = count($result_list[0]);
                for ($row = 0; $row < $rows; $row++)
                  for ($col = 0; $col < $cols; $col++)
                    $result_list[$row][$col] = (string) $result_list[$row][$col];
              }
            }
            echo json_encode($result_list);
            break;
    }
}
?>
