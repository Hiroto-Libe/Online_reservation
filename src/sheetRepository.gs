var SHEET_NAMES = {
  reservations: 'reservations',
  slotTemplates: 'slot_templates',
  slotOverrides: 'slot_overrides',
  menus: 'menus',
  settings: 'settings',
  logs: 'logs'
};

var RESERVATION_COLUMNS = [
  'reservation_id',
  'reservation_type',
  'status',
  'menu_code',
  'start_at',
  'end_at',
  'name',
  'tel',
  'email',
  'note',
  'calendar_event_id',
  'mail_sent',
  'created_at',
  'updated_at',
  'error_code',
  'error_message'
];

var MENU_COLUMNS = [
  'menu_code',
  'menu_label',
  'duration_minutes',
  'calendar_title_prefix'
];

var SLOT_TEMPLATE_COLUMNS = ['weekday', 'time', 'capacity'];
var SLOT_OVERRIDE_COLUMNS = ['date', 'time', 'capacity'];
var SETTINGS_COLUMNS = ['key', 'value'];
var LOG_COLUMNS = ['timestamp', 'code', 'reservation_id', 'message', 'stack'];

function appendReservation(record) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.reservations, RESERVATION_COLUMNS);
  var row = RESERVATION_COLUMNS.map(function (key) {
    return record[key] !== undefined ? record[key] : '';
  });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function updateReservationById(reservationId, fields) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.reservations, RESERVATION_COLUMNS);
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  var columnIndex = getColumnIndexMap_(values[0]);

  for (var i = 1; i < values.length; i++) {
    if (values[i][columnIndex.reservation_id] === reservationId) {
      for (var key in fields) {
        if (columnIndex[key] !== undefined) {
          sheet.getRange(i + 1, columnIndex[key] + 1).setValue(fields[key]);
        }
      }
      return true;
    }
  }
  return false;
}

function getReservationById(reservationId) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.reservations, RESERVATION_COLUMNS);
  var values = sheet.getDataRange().getValues();
  var header = values.shift();
  var columnIndex = getColumnIndexMap_(header);

  for (var i = 0; i < values.length; i++) {
    if (values[i][columnIndex.reservation_id] === reservationId) {
      return rowToObject_(header, values[i]);
    }
  }
  return null;
}

function countConfirmedReservationsAt(startAt) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.reservations, RESERVATION_COLUMNS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return 0;
  }
  var header = values[0];
  var columnIndex = getColumnIndexMap_(header);
  var targetKey = toDateTimeKey_(startAt);
  var count = 0;
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row[columnIndex.status] !== 'CONFIRMED') {
      continue;
    }
    var rowKey = toDateTimeKey_(row[columnIndex.start_at]);
    if (rowKey === targetKey) {
      count++;
    }
  }
  return count;
}

function getMenus() {
  var sheet = getOrCreateSheet_(SHEET_NAMES.menus, MENU_COLUMNS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [
      { menu_code: 'SHAKEN', menu_label: '車検', duration_minutes: 60, calendar_title_prefix: '【車検】' },
      { menu_code: 'TENKEN', menu_label: '点検', duration_minutes: 30, calendar_title_prefix: '【点検】' }
    ];
  }
  var header = values.shift();
  return values.map(function (row) {
    return rowToObject_(header, row);
  });
}

function getTimeOptions() {
  return generateTimeOptions_('09:00', '16:30', 15);
}

function getTimeOptionsForDate(dateInput) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.slotTemplates, SLOT_TEMPLATE_COLUMNS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return getTimeOptions();
  }
  var dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(dateObj.getTime())) {
    return getTimeOptions();
  }
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var weekday = Number(Utilities.formatDate(dateObj, tz, 'u')) % 7;
  var header = values.shift();
  var idx = getColumnIndexMap_(header);
  var map = {};
  for (var i = 0; i < values.length; i++) {
    if (Number(values[i][idx.weekday]) !== weekday) {
      continue;
    }
    var timeValue = values[i][idx.time];
    if (timeValue) {
      map[String(timeValue)] = true;
    }
  }
  var times = Object.keys(map).sort();
  return times.length ? times : getTimeOptions();
}

function getReservationDateRange() {
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var today = new Date();
  var minDate = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
  var maxDateObj = new Date(today.getTime());
  maxDateObj.setMonth(maxDateObj.getMonth() + 1);
  var maxDate = Utilities.formatDate(maxDateObj, tz, 'yyyy-MM-dd');
  return { minDate: minDate, maxDate: maxDate };
}

function getMenuByCode(menuCode) {
  var menus = getMenus();
  for (var i = 0; i < menus.length; i++) {
    if (menus[i].menu_code === menuCode) {
      return menus[i];
    }
  }
  return null;
}

function findSlotOverride(dateKey, timeKey) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.slotOverrides, SLOT_OVERRIDE_COLUMNS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }
  var header = values.shift();
  var idx = getColumnIndexMap_(header);
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowDate = toDateKey_(row[idx.date]);
    if (rowDate === dateKey && String(row[idx.time]) === timeKey) {
      return rowToObject_(header, row);
    }
  }
  return null;
}

function findSlotTemplate(weekday, timeKey) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.slotTemplates, SLOT_TEMPLATE_COLUMNS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }
  var header = values.shift();
  var idx = getColumnIndexMap_(header);
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (Number(row[idx.weekday]) === weekday && String(row[idx.time]) === timeKey) {
      return rowToObject_(header, row);
    }
  }
  return null;
}

function getSetting(key) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.settings, SETTINGS_COLUMNS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }
  var header = values.shift();
  var idx = getColumnIndexMap_(header);
  for (var i = 0; i < values.length; i++) {
    if (values[i][idx.key] === key) {
      return values[i][idx.value];
    }
  }
  return null;
}

function appendLog(code, reservationId, message, stack) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.logs, LOG_COLUMNS);
  sheet.appendRow([new Date(), code, reservationId || '', message || '', stack || '']);
}

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (headers) {
    ensureHeaderRow_(sheet, headers);
  }
  return sheet;
}

function ensureHeaderRow_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }
  var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var isEmpty = firstRow.every(function (cell) { return cell === '' || cell === null; });
  if (isEmpty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function getColumnIndexMap_(headerRow) {
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    map[String(headerRow[i]).trim()] = i;
  }
  return map;
}

function rowToObject_(header, row) {
  var obj = {};
  for (var i = 0; i < header.length; i++) {
    obj[String(header[i]).trim()] = row[i];
  }
  return obj;
}

function toDateKey_(value) {
  if (!value) {
    return '';
  }
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var date = value instanceof Date ? value : new Date(value);
  return Utilities.formatDate(date, tz, 'yyyy-MM-dd');
}

function toDateTimeKey_(value) {
  if (!value) {
    return '';
  }
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var date = value instanceof Date ? value : new Date(value);
  return Utilities.formatDate(date, tz, 'yyyy-MM-dd HH:mm');
}

function generateTimeOptions_(start, end, intervalMinutes) {
  var results = [];
  var partsStart = start.split(':');
  var partsEnd = end.split(':');
  var startMinutes = Number(partsStart[0]) * 60 + Number(partsStart[1]);
  var endMinutes = Number(partsEnd[0]) * 60 + Number(partsEnd[1]);
  for (var minutes = startMinutes; minutes <= endMinutes; minutes += intervalMinutes) {
    var hour = Math.floor(minutes / 60);
    var minute = minutes % 60;
    results.push((hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute);
  }
  return results;
}
