function logError(code, err, reservationId) {
  var message = err && err.message ? err.message : String(err);
  var stack = err && err.stack ? err.stack : '';
  appendLog(code, reservationId, message, stack);
}
