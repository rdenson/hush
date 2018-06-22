var body_parser = require('body-parser'),
    express = require('express'),
    fs = require('fs'),
    https = require('https'),
    //helmet = require('helmet'),
    kq = require('q'),
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
https.createServer(serverOptions, symbiot).listen(8080, function() {
  var ready = kq.defer(),
      vo = new vaultops(symbiot);

  symbiot.get('log').info('started; listening at 8080');
  symbiot.get('log').info('checking vault\'s initialization status...');

  vo.initialize().then(
    //checks were successful
    function(weNeededToInitialize) {
      //no matter the outcome of the initialization checks, we need to un-seal the vault
      vo.openVault().then(function() {
        if( weNeededToInitialize ){
          symbiot.get('log').info('initialized vault!');
          //initialization also includes PKI - certificates
          vo.setupCertificateInfrastructure().then(function() {
            symbiot.get('log').info('finished setting up certificate infrastructure');
            ready.resolve();
          });
        } else {
          symbiot.get('log').info('vault seems to be initialized already');
          ready.resolve();
        }
      });
    },
    //vault may not be accessible... these should be request failures
    function(failureInfo) {
      ready.reject();
      //handle the returned data from a rejection
      if( failureInfo != null ){
        symbiot.get('log').error(failureInfo.message);
        symbiot.get('log').error('fault description: ' + failureInfo.error);
      } else {
        symbiot.get('log').error('error could not be determined, check ./lib/vault-ops.js -> initialize()');
      }

      //if we're having trouble talking to vault, then this app will not be operational
      process.exit(1);
    }
  );

  ready.promise.then(function() {
    router.handleRequests(symbiot);
    symbiot.get('log').info('application is ready');
  });
});
