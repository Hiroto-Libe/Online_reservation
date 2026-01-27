function checkAvailability(startAt) {
  var capacity = getCapacityForStart_(startAt);
  if (capacity <= 0) {
    return false;
  }
  var count = countConfirmedReservationsAt(startAt);
  return count < capacity;
}

function getCapacityForStart_(startAt) {
  var tz = getSetting('timezone') || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var dateKey = Utilities.formatDate(startAt, tz, 'yyyy-MM-dd');
  var timeKey = Utilities.formatDate(startAt, tz, 'HH:mm');
  var override = findSlotOverride(dateKey, timeKey);
  if (override) {
    return Number(override.capacity) || 0;
  }
  var weekday = Number(Utilities.formatDate(startAt, tz, 'u')) % 7;
  var template = findSlotTemplate(weekday, timeKey);
  if (template) {
    return Number(template.capacity) || 0;
  }

  // Default to 1 when no templates are defined to allow initial testing.
  return 1;
}
