function SimpleLog(logid) {
  var instanceIdentifier = logid + ' ',
      that = this;

  function write(logLevel, logMessage) {
    var lvl = '[' + logLevel + '] ',
        timestamp = '(' + new Date().getTime() + ') ';

    process.stdout.write(instanceIdentifier + lvl + timestamp + '- ' + logMessage + '\n');
  };

  this.debug = function(logMessage) {
    write('debug', logMessage);
  };
  this.error = function(logMessage) {
    write('error', logMessage);
  };
  this.info = function(logMessage) {
    write('info', logMessage);
  };
  this.warn = function(logMessage) {
    write('warn', logMessage);
  };

  return this;
}


module.exports = SimpleLog;
