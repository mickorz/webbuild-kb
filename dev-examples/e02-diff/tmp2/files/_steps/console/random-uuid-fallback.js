/* Browsers expose crypto.randomUUID only in secure contexts (HTTPS or localhost), so the console
   served over plain HTTP on a LAN test instance would throw wherever it builds request ids.
   getRandomValues is available everywhere; build an RFC 4122 v4 id from it when needed. */
(function () {
  var cryptoApi = window.crypto;
  if (!cryptoApi || typeof cryptoApi.randomUUID === 'function' || typeof cryptoApi.getRandomValues !== 'function') return;
  cryptoApi.randomUUID = function () {
    var bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = [];
    for (var i = 0; i < 16; i++) hex.push((bytes[i] + 0x100).toString(16).slice(1));
    return hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' + hex.slice(6, 8).join('') + '-'
      + hex.slice(8, 10).join('') + '-' + hex.slice(10).join('');
  };
})();
