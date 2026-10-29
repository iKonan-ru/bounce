// Атомарные отметки 2FA в базе (pb_hooks/totp.pb.js). Прочитать запись, проверить код и
// сохранить - не атомарно: параллельные запросы с одним кодом успевают прочитать старое
// значение и все проходят проверку. Поэтому отметка ставится условным UPDATE: SQLite выполняет
// записи по одной, и условие выполняется только у первого запроса, остальные видят 0 изменённых
// строк.

// Принять шаг кода при входе: только если он новее последнего принятого.
function claimStep(app, userId, step) {
  const res = app
    .db()
    .newQuery('UPDATE users SET totp_step = {:step} WHERE id = {:id} AND totp_step < {:step}')
    .bind({ id: userId, step })
    .execute();
  return res.rowsAffected() === 1;
}

// Забрать неподтверждённый ключ при подключении 2FA: только если он всё ещё тот, что проверен
// кодом, и 2FA ещё не включена. Ключ стирается сразу: второй запрос с тем же кодом его уже не
// найдёт. Остальные поля запись получает обычным сохранением после этого.
function claimPending(app, userId, pending) {
  const res = app
    .db()
    .newQuery(
      [
        "UPDATE users SET totp_pending = ''",
        'WHERE id = {:id} AND totp_pending = {:pending} AND totp_enabled = FALSE',
      ].join(' '),
    )
    .bind({ id: userId, pending })
    .execute();
  return res.rowsAffected() === 1;
}

module.exports = { claimStep, claimPending };
