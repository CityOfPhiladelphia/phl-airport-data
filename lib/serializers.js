exports.res = function (res) {
  return {
    statusCode: res.statusCode,
    resTime: res.resTime,
    eTag: res._headers.etag
  }
};

exports.socket = function (client) {
  var id = client.id;
  return {
    clientId: id,
    connectedTotal: Object.keys(client.manager.connected).length,
    clients: client.store.store.manager.handshaken[id]
  }
};