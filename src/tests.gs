function runBasicTests() {
  var results = [];
  try {
    results.push(test_getReservationDateRange_());
    results.push(test_getTimeOptions_());
    results.push(test_validateReservationInput_ok_());
    results.push(test_validateReservationInput_outOfRangeDate_());
    results.push(test_validateReservationInput_invalidTime_());
    results.push(test_createReservation_basic_());
    results.push(test_capacityLimit_());
    results.push(test_doPost_flow_());
    results.push(test_slotTemplates_reflection_());
    results.push(test_adminPage_access_());
    Logger.log(results.join('\n'));
    return results;
  } catch (err) {
    Logger.log('TEST FAILED: ' + err);
    throw err;
  }
}

function test_getReservationDateRange_() {
  var range = getReservationDateRange();
  assert_(range.minDate <= range.maxDate, 'minDate <= maxDate');
  return 'OK: getReservationDateRange';
}

function test_getTimeOptions_() {
  var options = getTimeOptions();
  assert_(options.length > 0, 'time options not empty');
  assert_(options[0] === '09:00', 'time options start at 09:00');
  assert_(options[options.length - 1] === '16:30', 'time options end at 16:30');
  return 'OK: getTimeOptions';
}

function test_validateReservationInput_ok_() {
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var today = new Date();
  var dateKey = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
  var input = {
    menu_code: 'SHAKEN',
    start_at: new Date(dateKey + 'T09:00'),
    name: 'テスト太郎',
    tel: '000-0000-0000'
  };
  var errors = validateReservationInput(input);
  assert_(errors.length === 0, 'no validation errors');
  return 'OK: validateReservationInput (valid)';
}

function test_validateReservationInput_outOfRangeDate_() {
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var today = new Date();
  var past = new Date(today.getTime());
  past.setDate(past.getDate() - 2);
  var dateKey = Utilities.formatDate(past, tz, 'yyyy-MM-dd');
  var input = {
    menu_code: 'SHAKEN',
    start_at: new Date(dateKey + 'T09:00'),
    name: 'テスト太郎',
    tel: '000-0000-0000'
  };
  var errors = validateReservationInput(input);
  assert_(errors.length > 0, 'out of range date should error');
  return 'OK: validateReservationInput (out of range date)';
}

function test_validateReservationInput_invalidTime_() {
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var today = new Date();
  var dateKey = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
  var input = {
    menu_code: 'SHAKEN',
    start_at: new Date(dateKey + 'T08:00'),
    name: 'テスト太郎',
    tel: '000-0000-0000'
  };
  var errors = validateReservationInput(input);
  assert_(errors.length > 0, 'invalid time should error');
  return 'OK: validateReservationInput (invalid time)';
}

function test_createReservation_basic_() {
  var startAt = findAvailableStart_();
  var before = countConfirmedReservationsAt(startAt);
  var input = {
    reservation_type: 'WEB',
    menu_code: 'SHAKEN',
    start_at: startAt,
    name: 'テスト太郎',
    tel: '000-0000-0000',
    email: '',
    note: 'test'
  };
  var result = createReservation(input, { skipCalendar: true, skipMail: true });
  assert_(result.ok, 'createReservation should succeed');
  var reservationId = findLastReservationId_();
  assert_(reservationId, 'reservation_id should exist');
  var after = countConfirmedReservationsAt(startAt);
  assert_(after === before + 1, 'reservation count should increase by 1');
  var cancelResult = cancelReservation(reservationId);
  assert_(cancelResult.ok, 'cancelReservation should succeed');
  var finalCount = countConfirmedReservationsAt(startAt);
  assert_(finalCount === before, 'reservation count should return to before');
  return 'OK: createReservation (basic)';
}

function test_capacityLimit_() {
  var startAt = findAvailableStart_();
  var before = countConfirmedReservationsAt(startAt);
  var input = {
    reservation_type: 'WEB',
    menu_code: 'SHAKEN',
    start_at: startAt,
    name: 'テスト太郎',
    tel: '000-0000-0000',
    email: '',
    note: 'capacity-test'
  };
  var first = createReservation(input, { skipCalendar: true, skipMail: true });
  assert_(first.ok, 'first reservation should succeed');
  var second = createReservation(input, { skipCalendar: true, skipMail: true });
  assert_(!second.ok, 'second reservation should be rejected');
  var reservationId = findLastReservationId_();
  if (reservationId) {
    cancelReservation(reservationId);
  }
  var finalCount = countConfirmedReservationsAt(startAt);
  assert_(finalCount === before, 'reservation count should return to before');
  return 'OK: capacity limit';
}

function test_doPost_flow_() {
  var startAt = findAvailableStart_();
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var startDate = Utilities.formatDate(startAt, tz, 'yyyy-MM-dd');
  var startTime = Utilities.formatDate(startAt, tz, 'HH:mm');
  var before = countConfirmedReservationsAt(startAt);
  var e = {
    parameter: {
      reservation_type: 'WEB',
      menu_code: 'SHAKEN',
      start_date: startDate,
      start_time: startTime,
      name: 'テスト太郎',
      tel: '000-0000-0000',
      email: '',
      note: 'doPost-test'
    }
  };
  var output = doPost(e);
  assert_(output && output.getContent, 'doPost should return HtmlOutput');
  var reservationId = findLastReservationId_();
  assert_(reservationId, 'reservation_id should exist');
  var after = countConfirmedReservationsAt(startAt);
  assert_(after === before + 1, 'reservation count should increase by 1');
  var cancelResult = cancelReservation(reservationId);
  assert_(cancelResult.ok, 'cancelReservation should succeed');
  var finalCount = countConfirmedReservationsAt(startAt);
  assert_(finalCount === before, 'reservation count should return to before');
  return 'OK: doPost flow';
}

function test_slotTemplates_reflection_() {
  var sheet = getOrCreateSheet_(SHEET_NAMES.slotTemplates, SLOT_TEMPLATE_COLUMNS);
  var original = sheet.getDataRange().getValues();
  try {
    sheet.clearContents();
    sheet.appendRow(SLOT_TEMPLATE_COLUMNS);
    sheet.appendRow([1, '10:00', 1]);
    sheet.appendRow([2, '13:30', 1]);

    var mondayKey = getNextDateKeyForWeekday_(1);
    var tuesdayKey = getNextDateKeyForWeekday_(2);
    var mondayOptions = getTimeOptionsForDate(mondayKey);
    var tuesdayOptions = getTimeOptionsForDate(tuesdayKey);

    assert_(mondayOptions.length === 1 && mondayOptions[0] === '10:00', 'monday time options should match');
    assert_(tuesdayOptions.length === 1 && tuesdayOptions[0] === '13:30', 'tuesday time options should match');
    return 'OK: slot_templates reflection';
  } finally {
    sheet.clearContents();
    if (original && original.length) {
      sheet.getRange(1, 1, original.length, original[0].length).setValues(original);
    } else {
      ensureHeaderRow_(sheet, SLOT_TEMPLATE_COLUMNS);
    }
  }
}

function test_adminPage_access_() {
  var settingsSheet = getOrCreateSheet_(SHEET_NAMES.settings, SETTINGS_COLUMNS);
  var original = settingsSheet.getDataRange().getValues();
  try {
    setSettingValue_('admin_emails', getActiveUserEmail_() || 'admin@example.com');
    var output = doGet({ parameter: { mode: 'admin' } });
    assert_(output && output.getContent, 'admin doGet should return HtmlOutput');
    var html = output.getContent();
    assert_(html.indexOf('管理画面') !== -1, 'admin page should render');
    return 'OK: admin page access';
  } finally {
    restoreSettings_(settingsSheet, original);
  }
}

function getNextDateKeyForWeekday_(weekday) {
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var today = new Date();
  var todayKey = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
  var base = new Date(todayKey + 'T00:00');
  var todayWeekday = Number(Utilities.formatDate(base, tz, 'u')) % 7;
  var diff = (weekday - todayWeekday + 7) % 7;
  base.setDate(base.getDate() + diff);
  return Utilities.formatDate(base, tz, 'yyyy-MM-dd');
}

function setSettingValue_(key, value) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.settings, SETTINGS_COLUMNS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 1) {
    sheet.appendRow(SETTINGS_COLUMNS);
    values = sheet.getDataRange().getValues();
  }
  var header = values[0];
  var idx = getColumnIndexMap_(header);
  for (var i = 1; i < values.length; i++) {
    if (values[i][idx.key] === key) {
      sheet.getRange(i + 1, idx.value + 1).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function restoreSettings_(sheet, original) {
  sheet.clearContents();
  if (original && original.length) {
    sheet.getRange(1, 1, original.length, original[0].length).setValues(original);
  } else {
    ensureHeaderRow_(sheet, SETTINGS_COLUMNS);
  }
}

function findLastReservationId_() {
  var sheet = getOrCreateSheet_(SHEET_NAMES.reservations, RESERVATION_COLUMNS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return '';
  }
  var header = values[0];
  var columnIndex = getColumnIndexMap_(header);
  var lastRow = values[values.length - 1];
  return lastRow[columnIndex.reservation_id];
}

function findAvailableStart_() {
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var range = getReservationDateRange();
  var startDate = new Date(range.minDate + 'T00:00');
  for (var d = 0; d < 7; d++) {
    var dateKey = Utilities.formatDate(startDate, tz, 'yyyy-MM-dd');
    var timeOptions = getTimeOptionsForDate(dateKey);
    for (var i = 0; i < timeOptions.length; i++) {
      var startAt = new Date(dateKey + 'T' + timeOptions[i]);
      if (validateReservationInput({
        menu_code: 'SHAKEN',
        start_at: startAt,
        name: 'テスト',
        tel: '000'
      }).length === 0 && checkAvailability(startAt)) {
        return startAt;
      }
    }
    startDate.setDate(startDate.getDate() + 1);
  }
  throw new Error('No available slot found for test.');
}

function assert_(condition, message) {
  if (!condition) {
    throw new Error('ASSERT: ' + message);
  }
}
