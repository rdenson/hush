var extend = require('extend'),
    fs = require('fs'),
    intreq = require('./requests').func,
    kq = require('q');


var DEFAULT_VAULT_REQUEST_OPTIONS = {
      hostname: '192.168.7.2',
      path: '/v1',
      port: 8200
    },
    KEY_QUORUM = 2,
    VAULT_SECRETS_FILE = 'secrets.json';

function VaultOps(expressServer){
  var that = this;

  var _getToken = function() {
        var secrets = JSON.parse(fs.readFileSync(VAULT_SECRETS_FILE));

        return secrets.root_token;
      },
      _getKey = function(keyid) {
        var secrets = JSON.parse(fs.readFileSync(VAULT_SECRETS_FILE));

        return secrets.keys[keyid];
      },
      _reqFail = function(rejection, deferredObject) {
        expressServer.get('log').warn('request ' + rejection.id + ', failed... ' + rejection.message);
        if( typeof rejection.error === 'object' ){
          expressServer.get('log').error('request ' + rejection.id + ' ' + JSON.stringfy(rejection.error));
        }

        deferredObject.reject({
          error: rejection.message,
          message: 'Request failure in VaultOps!'
        });
      },
      _unseal = function(key) {
        var requestOptions = that.getVaultRequestOpts();
            unsealPayload = {
              'key': key
            };

        requestOptions.method = 'PUT';
        requestOptions.path += '/sys/unseal';

        return intreq.secure(requestOptions, JSON.stringify(unsealPayload));
      };

  /*
   * Unseals vault if it is sealed. Keys are managed from here.
   */
  this.openVault = function() {
    var actionDO = kq.defer(),
        requestOptions = that.getVaultRequestOpts(),
        vaultRequestPromises = [];

    //check to see if vault is sealed
    requestOptions.path += '/sys/seal-status';
    intreq.secure(requestOptions).then(function(vaultResponse) {
      expressServer.get('log').info('vault is currently ' + (vaultResponse.content.sealed ? 'sealed' : 'unsealed'));
      if( vaultResponse.content.sealed ){
        //we're sealed!
        //throw keys at the vault endpoint; number of keys == threshold
        for(var i = 0; i < KEY_QUORUM; i++){
          //maybe this should be external input from a human???
          expressServer.get('log').debug('submitting key (' + (i+1) + ') to unseal');
          vaultRequestPromises.push(_unseal(_getKey(i)));
        }

        kq.allSettled(vaultRequestPromises).then(function(requestResults) {
          var unsealProblem = false;

          //inspect unseal requests...
          requestResults.forEach(function(request) {
            //report progress or failure
            if( request.state == 'fulfilled' && request.value.httpStatus == 200 ){
              expressServer.get('log').debug('key accepted, progress: ' + request.value.content.progress)
            } else {
              unsealProblem = true;
              expressServer.get('log').warn('something went wrong...');
              expressServer.get('log').warn(request.state);
              expressServer.get('log').warn(request.value.httpStatus);
            }
          });

          //if there are no problems during unseal request, we should be good
          if( !unsealProblem ){
            expressServer.get('log').info('vault has been unsealed');
          }

          actionDO.resolve();
        });
      } else {
        //nothing to do here, vault is already unsealed
        actionDO.resolve();
      }
    }, function(rejection) { _reqFail(rejection, actionDO); });

    return actionDO.promise;
  };

  this.initialize = function() {
    var initDO = kq.defer(),
        initOpts = {
          'secret_shares': 3,
          'secret_threshold': KEY_QUORUM
        },
        requestOptions = that.getVaultRequestOpts();

    requestOptions.path += '/sys/init';
    //check vault initialization status
    intreq.secure(requestOptions).then(
      function(vaultResponse) {
        //look for cues to initialize
        if( vaultResponse.httpStatus == 200 && !vaultResponse.content.initialized ){
          expressServer.get('log').info('vault was found to be un-initialized... beginning setup');
          expressServer.get('log').debug('initializing vault with 3 keys');

          requestOptions.method = 'POST';
          //call vault's init
          intreq.secure(requestOptions, JSON.stringify(initOpts)).then(
            function(vaultResponse) {
              //get keys and root token, write to file
              fs.writeFileSync(VAULT_SECRETS_FILE, JSON.stringify(vaultResponse.content));
              //set for later...
              rootToken = vaultResponse.content.root_token;
              initDO.resolve();
            },
            function(rejection) { _reqFail(rejection, initDO); }
          );
        } else {
          //we're already initialized; reject: vault init not performed
          initDO.reject();
        }
      },
      function(rejection) { _reqFail(rejection, initDO); }
    );

    return initDO.promise;
  }

  this.setupCertificateInfrastructure = function() {
    var caCert = '',
        caContent = {
          'common_name': 'vault-ca',
          'organization': 'DensonVentures',
          ou: 'Research and Development',
          country: 'US',
          province: 'Texas',
          locality: 'Austin'
        },
        certificateAuthorityDO = kq.defer(),
        certificateChain = '',
        generalSetupDO = kq.defer(),
        intermediateCert = '',
        intermediateContent = {
          'common_name': 'vault-intermediate-ca',
          'organization': 'DensonVentures',
          'ou': 'Research and Development',
          'country': 'US',
          'province': 'Texas',
          'locality': 'Austin'
        },
        intermediateCsrDO = kq.defer(),
        requestOptions = that.getVaultRequestOpts(),
        signCsrContent = {
          "csr": "",
          "common_name": "vault-intermediate-ca",
          "format": "pem_bundle",
          "use_csr_values": true
        };

    expressServer.get('log').info('setting up certificate infrastructure');
    //use our credentials for API operation
    requestOptions.headers['X-Vault-Token'] = _getToken();
    requestOptions.method = 'POST';
    requestOptions.path += '/sys/mounts';
    intreq.secure(requestOptions, '{"type": "pki"}').then(
      function(vaultResponse) {
        if( vaultResponse.httpStatus == 204 ){
          expressServer.get('log').info('creating certificate authority...');

          //generate ca
          requestOptions.method = 'POST';
          requestOptions.path += '/pki/root/generate/internal';
          intreq.secure(requestOptions, JSON.stringify(caContent)).then(
            function(vaultResponse) {
              caCert = vaultResponse.content.data.certificate;
              expressServer.get('log').info('ca generated');
              certificateAuthorityDO.resolve();
            },
            function(rejection) { _reqFail(rejection, certificateAuthorityDO); }
          );
        } else {
          certificateAuthorityDO.reject(vaultResponse);
        }
      },
      function(rejection) { _reqFail(rejection, certificateAuthorityDO); }
    );

    certificateAuthorityDO.promise.then(
      function() {
        expressServer.get('log').info('creating intermediate ca...');
        requestOptions.method = 'POST';
        requestOptions.path += '/sys/mounts/intermediate-pki';
        intreq.secure(requestOptions, '{"type": "pki"}').then(
          function(vaultResponse) {
            requestOptions.method = 'POST';
            requestOptions.path += '/intermediate-pki/intermediate/generate/internal';
            intreq.secure(requestOptions, JSON.stringify(intermediateContent)).then(
              function(vaultResponse) {
                signCsrContent.csr = vaultResponse.content.data.csr;
                expressServer.get('log').info('a csr for the intermediate ca has been generated');
                intermediateCsrDO.resolve();
              },
              function(rejection) { _reqFail(rejection, intermediateCsrDO); }
            );
          },
          function(rejection) { _reqFail(rejection, intermediateCsrDO); }
        );
      },
      function(rejection) { intermediateCsrDO.reject(rejection); }
    );


    intermediateCsrDO.promise.then(
      function() {
        requestOptions.method = 'POST';
        requestOptions.path += '/intermediate-pki/pki/root/sign-intermediate';
        intreq.secure(requestOptions, JSON.stringify(signCsrContent)).then(
          function(vaultResponse) {
            intermediateCert = vaultResponse.content.data.certificate;
            certificateChain = vaultResponse.content.data.ca_chain;

            requestOptions.method = 'POST';
            requestOptions.path += '/intermediate-pki/intermediate/set-signed';
            intreq.secure(requestOptions, '{"certificate": "' + intermediateCert + '"}').then(
              function(vaultResponse) {
                if( vaultResponse.httpStatus == 204 ){
                  generalSetupDO.resolve();
                }
              },
              function(rejection) { _reqFail(rejection, generalSetupDO); }
            );
          },
          function(rejection) { _reqFail(rejection, generalSetupDO); }
        );
      },
      function(rejection) {
        console.log(rejection);
        generalSetupDO.reject();
      }
    );

    return generalSetupDO.promise;
  }
}

VaultOps.prototype = {
  getVaultRequestOpts: function() {
    return extend(true, {}, DEFAULT_VAULT_REQUEST_OPTIONS);
  }
}


module.exports = VaultOps;
