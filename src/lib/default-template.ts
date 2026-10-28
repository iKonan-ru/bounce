// Шаблон этапов нового проекта (из ТЗ). У проекта он свой: правится в настройках проекта и
// подставляется в каждую новую песню.

export type TemplateStage = { title: string; optional?: boolean; substeps?: string[] };

const LIVE_STEPS = ['поиск звука и подхода', 'запись дублей', 'выбор и редактирование дублей'];

export const DEFAULT_TEMPLATE: TemplateStage[] = [
  { title: 'Набросок, текст, идея' },
  { title: 'ИИ-эскиз аранжировки' },
  { title: 'Демо-аранжировка' },
  { title: 'Проект в Cubase, перенос стемов' },
  { title: 'Партия барабанов' },
  {
    title: 'Запись живых инструментов',
    substeps: ['Бас', 'Гитары', 'Вокал'].flatMap((i) => LIVE_STEPS.map((s) => `${i}: ${s}`)),
  },
  { title: 'Синтезаторы и виртуальные инструменты' },
  { title: 'Сведение' },
  { title: 'Эффекты', optional: true },
  { title: 'Общий мастер' },
];
