var extend = require('extend'),
    intreq = require('./lib/requests').func,
    vaultops = require('./lib/vault-ops');


function handler(expressServer) {
  expressServer.get('/about', function(request, response) {
    response.send('<h2><em>just a test...</em></h2>');
  });

  expressServer.get('/unseal/:key', function(request, response) {
    var vo = new vaultops(expressServer);

    vo.unseal(request.params.key).then(
      function(unsealResult) { response.json(unsealResult); },
      function(rejection) { response.status(500).json(rejection); }
    );
  });


  //testing tls connections; prototype
  var DEFAULT_VAULT_REQUEST_OPTIONS = {
        hostname: '192.168.7.2',
        path: '/v1',
        port: 8200
      };

  expressServer.get('/vault/status', function(request, response) {
    var requestOptions = extend(true, DEFAULT_VAULT_REQUEST_OPTIONS, {});

    requestOptions.path += '/sys/health'
    intreq.secure(requestOptions).then(
      //request success handler
      function(vaultResponse) {
        expressServer.get('log').info('successfully completed request: ' + vaultResponse.id);
        //lay in the request UUID
        vaultResponse.content['request_id'] = vaultResponse.id;
        response.json(vaultResponse.content);
      },
      //request failure handler
      function(rejection) {
        expressServer.get('log').warn('request ' + rejection.id + ', failed... ' + rejection.message);
        if( typeof rejection.error === 'object' ){
          expressServer.get('log').error('request ' + rejection.id + ' ' + JSON.stringfy(rejection.error));
        }

        response.status(500).json(rejection);
      }
    );
  });
}


exports.handleRequests = handler
