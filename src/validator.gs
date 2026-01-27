function validateReservationInput(input) {
  if (!input) {
    return ['Invalid request.'];
  }
  var errors = [];
  if (!input.menu_code) {
    errors.push('Menu is required.');
  }
  if (!input.start_at || isNaN(input.start_at.getTime())) {
    errors.push('Start time is invalid.');
  }
  if (!input.name) {
    errors.push('Name is required.');
  }
  if (!input.tel) {
    errors.push('Telephone is required.');
  }
  return errors;
}
