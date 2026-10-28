// Задачи планировщика (pb_hooks/planner.pb.js): когда задачу отметили выполненной - время
// отметки, сняли отметку - пусто. По нему показываются недавно выполненные.

function stampDone(task) {
  if (task.getBool('done')) {
    if (!task.getString('done_at')) task.set('done_at', new Date().toISOString());
  } else {
    task.set('done_at', '');
  }
}

module.exports = { stampDone };
