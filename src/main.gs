function doGet(e) {
  var mode = (e && e.parameter && e.parameter.mode) || 'web';
  if (mode === 'admin') {
    if (!isAdminUser_()) {
      return HtmlService.createHtmlOutput('<h2>権限がありません。</h2>');
    }
    var adminTemplate = HtmlService.createTemplateFromFile('admin_form');
    adminTemplate.reservations = getRecentReservations(50);
    adminTemplate.adminEmail = getActiveUserEmail_();
    return adminTemplate.evaluate().setTitle('管理画面');
  }
  var templateName = mode === 'phone' ? 'phone_form' : 'web_form';
  var template = HtmlService.createTemplateFromFile(templateName);
  template.menus = getMenus();
  var dateRange = getReservationDateRange();
  template.minDate = dateRange.minDate;
  template.maxDate = dateRange.maxDate;
  template.timeOptions = getTimeOptionsForDate(dateRange.minDate);
  return template.evaluate().setTitle('Reservation');
}

function doPost(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var baseUrl = ScriptApp.getService().getUrl();
    var redirectMode = (params.reservation_type || '').toUpperCase() === 'PHONE' ? 'phone' : 'web';
    var redirectUrl = baseUrl + '?mode=' + redirectMode;
    if (params.action === 'admin_cancel') {
      return handleAdminCancel_(params, baseUrl + '?mode=admin');
    }
    var input = normalizeInput_(params);
    var result = createReservation(input);
    if (!result.ok) {
      return renderResult_(result.message, false, redirectUrl);
    }
    return renderResult_(result.message, true, redirectUrl);
  } catch (err) {
    logError('DOPOST_ERROR', err, null);
    return renderResult_('予約に失敗しました。管理者に連絡してください。', false, ScriptApp.getService().getUrl());
  }
}

function renderResult_(message, ok, redirectUrl) {
  var color = ok ? '#2b7a0b' : '#b00020';
  var safeUrl = redirectUrl || ScriptApp.getService().getUrl();
  var html = '<!doctype html><html><head><meta charset="utf-8">' +
    '<title>Result</title>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta http-equiv="refresh" content="1; url=' + safeUrl + '">' +
    '</head><body style="font-family:Arial, sans-serif; padding:24px;">' +
    '<h2 style="color:' + color + ';">' + message + '</h2>' +
    '<p><a href="' + safeUrl + '">元の画面へ戻る</a></p>' +
    '<script>setTimeout(function(){window.location.replace("' + safeUrl + '");}, 800);</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html);
}

function normalizeInput_(params) {
  var startAt = null;
  if (params.start_at) {
    startAt = new Date(params.start_at);
  } else if (params.start_date && params.start_time) {
    startAt = new Date(params.start_date + 'T' + params.start_time);
  }
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

function handleAdminCancel_(params, redirectUrl) {
  if (!isAdminUser_()) {
    return HtmlService.createHtmlOutput('<h2>権限がありません。</h2>');
  }
  var reservationId = (params.reservation_id || '').trim();
  if (!reservationId) {
    return renderResult_('予約IDを入力してください。', false, redirectUrl);
  }
  var result = cancelReservation(reservationId);
  return renderResult_(result.message, result.ok, redirectUrl);
}

function getActiveUserEmail_() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    email = Session.getEffectiveUser().getEmail();
  }
  return email || '';
}

function isAdminUser_() {
  var email = getActiveUserEmail_();
  if (!email) {
    return false;
  }
  var allowList = getSetting('admin_emails');
  if (!allowList) {
    return false;
  }
  var allowed = allowList.split(',').map(function (item) {
    return String(item).trim().toLowerCase();
  }).filter(Boolean);
  return allowed.indexOf(email.toLowerCase()) !== -1;
}
