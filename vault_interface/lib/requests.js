var extend = require('extend'),
    fs = require('fs'),
    https = require('https'),
    kq = require('q'),
    path = require('path'),
    uuidv1 = require('uuid/v1');


var infrastructureRootCA = path.resolve(__dirname, '../tls/dvca.crt');
var DEFAULT_REQUEST_OPTIONS = {
      port: 443,
      method: 'GET',
      ca: fs.readFileSync(infrastructureRootCA),
      agent: false //opt out of connection pooling
    },
    DEFAULT_TIMEOUT = 10000;

function secRequest(opts, payload) {
  var requestId = uuidv1(),
      requestOptions = extend(true, DEFAULT_REQUEST_OPTIONS, opts),
      responseDO = kq.defer(),
      standardRequest = {};
  var isPost = (requestOptions.method == 'POST' || requestOptions.method == 'PUT') && payload != undefined;

  if( isPost ){
    //add header key to object if not present
    if( requestOptions.headers == null ){
      requestOptions.headers = {};
    }

    requestOptions.headers['Content-Type'] = 'application/json';
    requestOptions.headers['Content-Length'] = Buffer.byteLength(payload);
  }

  standardRequest = https.request(requestOptions, function(httpsResponse) {
    var content = '';

    httpsResponse.setEncoding('utf8');
    httpsResponse.on('data', function(chunk) {
      content += chunk;
    });
    httpsResponse.on('end', function() {
      responseDO.resolve({
        content: JSON.parse(content),
        headers: httpsResponse.headers,
        httpStatus: httpsResponse.statusCode,
        id: requestId,
        requestedResource: requestOptions.method + ' ' + requestOptions.path,
        payload: payload
      });
    });
  });

  standardRequest.setTimeout(DEFAULT_TIMEOUT, function() {
    responseDO.reject({
      error: false,
      id: requestId,
      message: 'request timed out after ' + (DEFAULT_TIMEOUT/1000) + 's'
    });
  });

  standardRequest.on('error', function(err) {
    var location = requestOptions.hostname,
        operation = requestOptions.method + ' ' + requestOptions.path;

    responseDO.reject({
      error: err,
      id: requestId,
      message: 'error making request to ' + location + ' for ' + operation
    });
  });

  if( isPost ){
    standardRequest.write(payload);
  }

  standardRequest.end();

  return responseDO.promise;
}

exports.func = {
  secure: secRequest
};
