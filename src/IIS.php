<?php // UTF-8 without BOM

require_once 'Dispatcher.php';

function stringify(&$data) {
    $rows = count($data);
    if ($rows) {
      $cols = count($data[0]);
      for ($row = 0; $row < $rows; $row++)
        for ($col = 0; $col < $cols; $col++)
          $data[$row][$col] = (string) $data[$row][$col];
    }
}

foreach($_POST as $post_key => $post_value) {
    switch ($post_key) {
        case 'getUserName':
            $local = "$xmlroot/$_SESSION[country]/Favorites/$_SESSION[username].xml";
            if (!file_exists($local)) {
                if (file_exists("$profile/Favorites.xml"))
                  copy("$profile/Favorites.xml", $local);
                else
                  file_put_contents($local,
                                    '<?xml version="1.0" encoding="UTF-8"?>'.
                                    '<!DOCTYPE menu SYSTEM "../../DTD/Menu.dtd">'.
                                    "<menu title=\"FAVORITES\"></menu>");
            }
            copy($local, "$profile/Favorites.xml");
            echo $_SESSION['username'];
            break;

        case 'getTitle':
            echo "CMS $_SESSION[country] ( $_SERVER[SERVER_NAME] )";
            break;

        case 'listDirectory':
            $filenames = [];
            foreach (glob("$xmlroot/$_SESSION[country]/$post_value/*.xml") as $path)
              $filenames[] = basename($path);
            echo json_encode($filenames);
            break;

        case 'readXLSXFile':
            if (str_replace('\\', '/', substr($post_value, 0, strlen($xmlroot))) !== $xmlroot)
              $post_value = "$xmlroot/$_SESSION[country]/".str_replace('\\', '/',$post_value);
            echo file_get_contents($post_value);
            break;

        case 'readXMLFile':
            $specific = str_replace('.xml', '_IIS.xml', "$xmlroot/$_SESSION[country]/$post_value");
            $bom = pack('H*','EFBBBF');
            echo preg_replace("/^$bom/", '', file_get_contents(
              file_exists($specific) ? $specific : "$xmlroot/$_SESSION[country]/$post_value"));
            break;

        case 'runPSQuery':
            require_once 'PS.php';
            PS($post_value, $result_list);
            stringify($result_list);
            echo json_encode($result_list);
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
              stringify($result_list);
            }
            echo empty($result_list) ? "{\"affectedRows\":$result[0],\"insertId\":$result[1]}" : json_encode($result_list);
            break;
            
        case 'menu_save_favorites':
            $local = "$xmlroot/$_SESSION[country]/Favorites/$_SESSION[username].xml";
            $title = ($favorites = simplexml_load_file($local, null, LIBXML_NOCDATA)) ?
                      $favorites['title'] : 'FAVORITES';
            $contents = '<?xml version="1.0" encoding="UTF-8"?>'."\n".
                        '<!DOCTYPE menu SYSTEM "../../DTD/Menu.dtd">'."\n".
                        "<menu title=\"$title\">\n$post_value</menu>";
            file_put_contents($local, $contents);
            copy($local, "$profile/Favorites.xml");
            break;
    }
}
?>
