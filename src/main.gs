function doGet(e) {
  var mode = (e && e.parameter && e.parameter.mode) || 'web';
  var templateName = mode === 'phone' ? 'phone_form' : 'web_form';
  var template = HtmlService.createTemplateFromFile(templateName);
  template.menus = getMenus();
  return template.evaluate().setTitle('Reservation');
}

function doPost(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var input = normalizeInput_(params);
    var result = createReservation(input);
    if (!result.ok) {
      return renderResult_(result.message, false);
    }
    return renderResult_(result.message, true);
  } catch (err) {
    logError('DOPOST_ERROR', err, null);
    return renderResult_('Reservation failed. Please contact the administrator.', false);
  }
}

function renderResult_(message, ok) {
  var color = ok ? '#2b7a0b' : '#b00020';
  var html = '<!doctype html><html><head><meta charset="utf-8">' +
    '<title>Result</title></head><body style="font-family:Arial, sans-serif;">' +
    '<h2 style="color:' + color + ';">' + message + '</h2>' +
    '<p><a href="' + ScriptApp.getService().getUrl() + '">Back</a></p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html);
}

function normalizeInput_(params) {
  var startAt = params.start_at ? new Date(params.start_at) : null;
  return {
    reservation_type: params.reservation_type || 'WEB',
    menu_code: (params.menu_code || '').trim(),
    start_at: startAt,
    name: (params.name || '').trim(),
    tel: (params.tel || '').trim(),
    email: (params.email || '').trim(),
    note: (params.note || '').trim()
  };
}
