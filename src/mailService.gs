function sendAdminNotification(reservation, menu) {
  var to = getSetting('notify_mail_to');
  if (!to) {
    to = Session.getActiveUser().getEmail();
  }
  if (!to) {
    return;
  }
  var subject = 'New reservation: ' + reservation.menu_code;
  var body = '' +
    'Reservation ID: ' + reservation.reservation_id + '\n' +
    'Type: ' + reservation.reservation_type + '\n' +
    'Menu: ' + reservation.menu_code + '\n' +
    'Start: ' + reservation.start_at + '\n' +
    'End: ' + reservation.end_at + '\n' +
    'Name: ' + reservation.name + '\n' +
    'Tel: ' + reservation.tel + '\n' +
    'Email: ' + (reservation.email || '-') + '\n' +
    'Note: ' + (reservation.note || '-');
  MailApp.sendEmail(to, subject, body);
}
