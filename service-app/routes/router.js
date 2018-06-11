var http = require('http'),
    https = require('https'),
    kq = require('q'),
    mongoose = require('mongoose');


function handler(svr) {
  var globalDatabaseResponse = '',
      globalVaultResponse = '';

  //static main page
  svr.get('/index', function(request, response) {
    var htmlcontent =
          '<!DOCTYPE html>' +
          '<html lang="en">' +
            '<head>' +
              '<title>service-app</title>' +
            '</head>' +
            '<body>' +
              '<h3>Vault - Get RO Credentials</h3>' +
              '<form action="/vault/creds" method="post">' +
                '<button id="vaultsubmit" type="submit">get some creds</button>' +
              '</form>' +
              '<div style="margin-top: 10px; margin-bottom: 30px;"><textarea id="vaultresult" cols="100" rows="10">' + globalVaultResponse + '</textarea></div>' +
              '' +
              '<h3>Database - Connection</h3>' +
              '<form action="/database/connection" method="post">' +
                '<label for="creduser">username</label>' +
                '<input id="creduser" name="creduser" type="text" value="wordsworth"><br>' +
                '<label for="credpass">password</label>' +
                '<input id="credpass" name="credpass" type="text" value="userpassword"><br>' +
                '<button id="credsubmit" type="submit">try to connect</button>' +
              '</form>' +
              '<div style="margin-top: 10px;"><textarea id="connectionresult" cols="100" rows="10">' + globalDatabaseResponse + '</textarea></div>' +
            '</body>' +
          '</html>';

    response.write(htmlcontent);
    response.end();
  });

  //action routes
  svr.post('/database/connection', function(request, response) {
    var creds = request.body.creduser + ':' + request.body.credpass,
        mongoUri = {
          prefix: 'mongodb://',
          suffix: '@192.168.7.2/red'
        };

    mongoose.Promise = require('q').Promise;
    mongoose.connect(mongoUri.prefix + creds + mongoUri.suffix, {}, function(connectionError) {
      if( connectionError != null ){
        console.log('APP [ERROR] - there was a problem while connecting to mongo');
        globalDatabaseResponse = connectionError;
      } else {
        globalDatabaseResponse = 'CONNECTED!';
      }

      response.redirect('/index');
    });
  });

  svr.post('/vault/creds', function(request, response) {
    var reqOpts = {
          hostname: 'vault.dv.net',
          port: 8200,
          //path: '/v1/secret/test_secret',
          path: '/v1/database/creds/reddb-reader',
          headers: {
            'X-Vault-Token': '6b333db2-a28b-8c5b-e3df-265babf4bc8c'
          },
          method: 'GET',
          rejectUnauthorized: false
        },
        vaultReq = {};

    vaultReq = https.request(reqOpts, function(vaultResp) {
      var respData = '';

      vaultResp.setEncoding('utf8');
      vaultResp.on('data', function(chunk) {
        respData += chunk;
      });
      vaultResp.on('end', function() {
        globalVaultResponse = respData;
        response.redirect('/index');
      });
    });

    vaultReq.on('error', function(err){
      console.log('APP [ERROR] - there was a problem while making a request to vault');
      console.log(err);
      response.end();
    });

    vaultReq.end();
  });
}


exports.handleRequests = handler
