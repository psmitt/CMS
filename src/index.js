const fs = require('fs')

fs.readFile('C:\\inetpub\\xmlroot\\HUN\\Menu\\3. Tables.xml', 'utf-8', (err, data) => {
  if (err) {
    alert(err.message)
    return;
  }

  console.log(data)
})
