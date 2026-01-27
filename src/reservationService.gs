function createReservation(input) {
  var lock = lockForReservations();
  var reservationId = null;
  lock.waitLock(20000);
  try {
    var errors = validateReservationInput(input);
    if (errors.length) {
      return { ok: false, message: errors.join(' ') };
    }

    if (!checkAvailability(input.start_at)) {
      return { ok: false, message: 'No available slots for the selected time.' };
    }

    var menu = getMenuByCode(input.menu_code);
    if (!menu) {
      return { ok: false, message: 'Menu not found.' };
    }

    var startAt = input.start_at;
    var endAt = new Date(startAt.getTime() + menu.duration_minutes * 60000);
    var now = new Date();

    reservationId = Utilities.getUuid();
    var record = {
      reservation_id: reservationId,
      reservation_type: input.reservation_type,
      status: 'CONFIRMED',
      menu_code: input.menu_code,
      start_at: startAt,
      end_at: endAt,
      name: input.name,
      tel: input.tel,
      email: input.email,
      note: input.note,
      calendar_event_id: '',
      mail_sent: false,
      created_at: now,
      updated_at: now,
      error_code: '',
      error_message: ''
    };

    appendReservation(record);

    var eventId = createCalendarEvent(record, menu);
    updateReservationById(reservationId, {
      calendar_event_id: eventId,
      updated_at: new Date()
    });

    sendAdminNotification(record, menu);
    updateReservationById(reservationId, {
      mail_sent: true,
      updated_at: new Date()
    });

    return { ok: true, message: 'Reservation accepted.' };
  } catch (err) {
    if (reservationId) {
      updateReservationById(reservationId, {
        status: 'ERROR',
        error_code: 'CREATE_FAILED',
        error_message: String(err),
        updated_at: new Date()
      });
    }
    logError('CREATE_RESERVATION_FAILED', err, reservationId);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function cancelReservation(reservationId) {
  var reservation = getReservationById(reservationId);
  if (!reservation) {
    return { ok: false, message: 'Reservation not found.' };
  }

  updateReservationById(reservationId, {
    status: 'CANCELED',
    updated_at: new Date()
  });

  if (reservation.calendar_event_id) {
    deleteCalendarEvent(reservation.calendar_event_id);
  }

  return { ok: true, message: 'Reservation canceled.' };
}
