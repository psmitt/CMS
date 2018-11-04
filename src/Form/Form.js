const aside = document.querySelector('aside')

$('header>h1', aside).on('click', function () {
  console.log('form title clicked');
})

$('header>span', aside).on('click', event => {
  console.log('form close clicked');
})