// Роли в проекте (pb_hooks/roles.pb.js): у каждого человека в проекте одна роль, владелец - не в
// списках участников.

const ROLE_LISTS = ['editors', 'contributors', 'viewers'];

function checkRoles(project) {
  const owner = project.getString('owner');
  const seen = {};
  for (const list of ROLE_LISTS) {
    for (const id of project.getStringSlice(list)) {
      if (id === owner || seen[id]) {
        throw new BadRequestError('У каждого участника проекта одна роль.', {
          [list]: new ValidationError('role_conflict', 'У каждого участника одна роль.'),
        });
      }
      seen[id] = true;
    }
  }
}

module.exports = { ROLE_LISTS, checkRoles };
