var body_parser = require('body-parser'),
    express = require('express'),
    fs = require('fs'),
    https = require('https'),
    //helmet = require('helmet'),
    router = require('./router'),
    simpleLog = require('./lib/simple-log'),
    vaultops = require('./lib/vault-ops')

var symbiot = express(),
    serverOptions = {
      cert: fs.readFileSync('tls/symbiot.crt'),
      key: fs.readFileSync('tls/symbiot-cert.key'),
    },
    slog = new simpleLog('SYMBIOT');


symbiot.set('tagline', 'an interface to vault and secrets operations');
symbiot.set('log', slog);
symbiot.use(body_parser.json());
symbiot.use(body_parser.urlencoded({ extended: true }));
//symbiot.use(helmet());
symbiot.get('log').info('starting up...' + symbiot.get('tagline'));

//server start
//symbiot.listen(8000);
https.createServer(serverOptions, symbiot).listen(8080, function() {
  var vo = new vaultops(symbiot);

  symbiot.get('log').info('started; listening at 8080');
  router.handleRequests(symbiot);

  vo.initialize().then(
    //initialzation logic
    function() {
      symbiot.get('log').info('initialized vault!');
      //vo.setupCertificateInfrastructure();
    },
    //...
    function(info) {
      //something to report?
      if( info != null ){
        //we ran into an issue
        symbiot.get('log').error(info.message);
        symbiot.get('log').error('fault description: ' + info.error);
      } else {
        //check for sealed status and unseal if necessary
        symbiot.get('log').info('vault seems to be initialized already');
        vo.openVault().then(function() {
          vo.setupCertificateInfrastructure();
        });
      }
    }
  );
});
