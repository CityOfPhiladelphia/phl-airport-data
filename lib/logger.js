var bunyan = require('bunyan');
var serializers = require('./serializers');

exports.log = bunyan.createLogger({
  name: 'phl-airport-data',
  streams: [
    {
      level: 'debug',
      path: './logs/phl-airport-log.log',
      type: 'rotating-file',
      period: '1d',
      count: 5
    }
  ],
  serializers: {
    ws_conn: serializers.socket,
    req: bunyan.stdSerializers.req,
    res: serializers.res
  }
});