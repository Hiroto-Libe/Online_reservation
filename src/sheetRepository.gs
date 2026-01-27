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
      { menu_code: 'SHAKEN', menu_label: 'Shaken', duration_minutes: 60, calendar_title_prefix: '[SHAKEN] ' },
      { menu_code: 'TENKEN', menu_label: 'Tenken', duration_minutes: 30, calendar_title_prefix: '[TENKEN] ' }
    ];
  }
  var header = values.shift();
  return values.map(function (row) {
    return rowToObject_(header, row);
  });
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
