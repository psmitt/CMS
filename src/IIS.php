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

        case 'runSQLQueries':
            $parameters = json_decode($post_value);
            $result = SQL($parameters->queries, $result_list, $parameters->dsn, $parameters->user, $parameters->pass);
            // Stringify all values
            $rows = count($result_list);
            if ($rows) {
              $cols = count($result_list[0]);
              for ($row = 0; $row < $rows; $row++)
                for ($col = 0; $col < $cols; $col++)
                  $result_list[$row][$col] = (string) $result_list[$row][$col];
            }
            echo json_encode($result_list);
            break;
    }
}
?>
