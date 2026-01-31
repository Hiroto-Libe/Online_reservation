function validateReservationInput(input) {
  if (!input) {
    return ['不正なリクエストです。'];
  }
  var errors = [];
  if (!input.menu_code) {
    errors.push('メニューを選択してください。');
  }
  if (!input.start_at || isNaN(input.start_at.getTime())) {
    errors.push('予約日時が正しくありません。');
  } else {
    var range = getReservationDateRange();
    var startDateKey = toDateKey_(input.start_at);
    if (startDateKey < range.minDate || startDateKey > range.maxDate) {
      errors.push('予約日は本日から1ヶ月以内で指定してください。');
    }
    var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
    var startTime = Utilities.formatDate(input.start_at, tz, 'HH:mm');
    var timeOptions = getTimeOptionsForDate(input.start_at);
    if (timeOptions.indexOf(startTime) === -1) {
      errors.push('予約時間は受付可能時間内で指定してください。');
    }
  }
  if (!input.name) {
    errors.push('氏名を入力してください。');
  }
  if (!input.tel) {
    errors.push('電話番号を入力してください。');
  }
  return errors;
}
