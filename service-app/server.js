var body_parser = require('body-parser'),
    express = require('express'),
    router = require('./routes/router');

var demoServ = express();

demoServ.set('title', 'demo vault functionality, as a public front-end');
demoServ.use(body_parser.json());
demoServ.use(body_parser.urlencoded({ extended: true }));
demoServ.use(express.static(__dirname + '/public'));

console.log('APP [info] - starting up...');
console.log('APP [info] - ' + demoServ.get('title'));
demoServ.listen(8080, function() {
  console.log('APP [info] - started; listening at 8080');
  router.handleRequests(demoServ);
});
