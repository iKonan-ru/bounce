/// <reference path="../pb_data/types.d.ts" />

// Значение направления other и id старых этапов остаются совместимыми.
migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId('projects');
    const stages = app.findCollectionByNameOrId('other_stages');
    const tasks = new Collection({
      type: 'base',
      name: 'project_tasks',
      listRule: stages.listRule,
      viewRule: stages.viewRule,
      createRule: stages.createRule,
      updateRule: app.findCollectionByNameOrId('videos').updateRule,
      deleteRule: stages.deleteRule,
      fields: [
        {
          name: 'project',
          type: 'relation',
          collectionId: projects.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'title', type: 'text', required: true, max: 120 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['not_started', 'active', 'paused', 'done'],
        },
        { name: 'position', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(tasks);
    const notes = app.findCollectionByNameOrId('notes');
    for (const collection of [stages, notes]) {
      collection.fields.add(
        new Field({
          name: 'project_task',
          type: 'relation',
          collectionId: tasks.id,
          maxSelect: 1,
          cascadeDelete: true,
        })
      );
      collection.updateRule =
        collection.name === 'notes'
          ? collection.updateRule.replace(
              /@request.body.other_stage:changed = false/g,
              '@request.body.other_stage:changed = false && @request.body.project_task:changed = false'
            )
          : `${collection.updateRule} && @request.body.project_task:changed = false`;
      app.save(collection);
    }
    const oldStages = app.findAllRecords('other_stages');
    const oldNotes = app.findRecordsByFilter('notes', 'other = true', '', 0);
    const projectIds = [
      ...new Set(
        [...oldStages, ...oldNotes].map((record) => record.getString('project'))
      ),
    ];
    for (const projectId of projectIds) {
      const task = new Record(tasks);
      task.set('project', projectId);
      task.set('title', 'Задачи');
      const hasStarted = oldStages.some(
        (stage) =>
          stage.getString('project') === projectId &&
          ['in_progress', 'done'].includes(stage.getString('status'))
      );
      task.set('status', hasStarted ? 'active' : 'not_started');
      app.save(task);
      for (const record of [...oldStages, ...oldNotes]) {
        if (record.getString('project') === projectId) {
          record.set('project_task', task.id);
          app.save(record);
        }
      }
    }
    stages.fields.getByName('project_task').required = true;
    app.save(stages);
  },
  (app) => {
    if (app.findAllRecords('project_tasks').length > 0) {
      throw new Error(
        'Откат удалит задачи. Сначала восстановите резервную копию.'
      );
    }

    for (const name of ['other_stages', 'notes']) {
      const collection = app.findCollectionByNameOrId(name);
      collection.fields.removeByName('project_task');
      collection.updateRule = collection.updateRule.replace(
        / && @request.body.project_task:changed = false/g,
        ''
      );
      app.save(collection);
    }
    app.delete(app.findCollectionByNameOrId('project_tasks'));
  }
);
