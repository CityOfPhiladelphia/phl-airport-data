module.exports = function responseLog() {
  return function (req, res, next) {
    var start = new Date;

    res.on('header', function () {
      var duration = new Date - start;
      res.resTime = duration;
      log.info({res: res}, 'REST response sent');
    });
    next();
  };
};