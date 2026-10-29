// Роли в проекте (pb_hooks/roles.pb.js): у каждого человека в проекте одна роль, владелец - не в
// списках участников.

/** Поля проекта со списками участников по ролям */
const ROLE_LISTS = ['editors', 'contributors', 'viewers'];

/** У каждого человека в проекте одна роль; иначе - отказ с полем, где нашёлся повтор */
function validateRoles(project) {
  const owner = project.getString('owner');
  const seenIds = new Set();
  for (const roleList of ROLE_LISTS) {
    for (const userId of project.getStringSlice(roleList)) {
      const isRepeated = userId === owner || seenIds.has(userId);
      if (isRepeated) {
        const errors = {};
        errors[roleList] = new ValidationError('role_conflict', 'У каждого участника одна роль.');
        throw new BadRequestError('У каждого участника проекта одна роль.', errors);
      }
      seenIds.add(userId);
    }
  }
}

module.exports = { ROLE_LISTS, validateRoles };
