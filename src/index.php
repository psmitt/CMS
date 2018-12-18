<?php // ŰTF-8 without BOM

require_once 'Dispatcher.php';
if ($_SESSION['role'] != 'Admin'
and $_SESSION['role'] != 'Agent')
    header('Location: /EUP');

$settings = json_decode(file_get_contents("$profile/Settings.json"), true);
$test     = strtolower($_SERVER['HTTP_HOST']) == 'cms4test' ? ' TEST' : '';

$index = str_replace(['href="Font/Font.css"',
                      '<script src="Electron.js"></script>'],
                     ['href="https://fonts.googleapis.com/css?family=Barlow+Semi+Condensed|Nova+Mono"',
                      '<script src="xlsx.core.min.js"></script><script src="IIS.js"></script>'],
                     file_get_contents('index.html'));

if (count($_GET)) foreach ($_GET as $menu_class => $menu_order)
  $index = str_replace('</body>',
                       "<script>
                         document.addEventListener('DOMContentLoaded', _ => {
                            Load['$menu_class']('$menu_order');
                            shrinkNavigationFrame();
                         })
                       </script></body>",
                       $index);

echo $index;
?>
