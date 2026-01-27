function createCalendarEvent(reservation, menu) {
  var calendarId = getSetting('calendar_id');
  var calendar = calendarId ? CalendarApp.getCalendarById(calendarId) : CalendarApp.getDefaultCalendar();
  if (!calendar) {
    throw new Error('Calendar not found.');
  }
  var titlePrefix = menu && menu.calendar_title_prefix ? menu.calendar_title_prefix : '';
  var title = titlePrefix + reservation.name + ' (' + reservation.tel + ')';
  var description = 'Reservation ID: ' + reservation.reservation_id + '\n' +
    'Menu: ' + reservation.menu_code + '\n' +
    'Type: ' + reservation.reservation_type + '\n' +
    'Email: ' + (reservation.email || '-') + '\n' +
    'Note: ' + (reservation.note || '-');
  var event = calendar.createEvent(title, reservation.start_at, reservation.end_at, {
    description: description
  });
  return event.getId();
}

function deleteCalendarEvent(eventId) {
  if (!eventId) {
    return;
  }
  var event = CalendarApp.getEventById(eventId);
  if (event) {
    event.deleteEvent();
  }
}
