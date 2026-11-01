import { PlanItemKind } from '@/widgets/plan';
import type { MyPlanEntry } from '../types/my-plan';

/** Поиск по названию записи и связанного материала, без учета регистра */
export function checkMatchesPlanSearch(
  entry: MyPlanEntry,
  search: string
): boolean {
  const query = search.trim().toLocaleLowerCase();
  let text: string;

  if (entry.kind === 'music') {
    const song = entry.songs.find((item) => item.id === entry.post.song);
    text = `${entry.post.title} ${song?.title ?? ''}`;
  } else if (entry.kind === 'video') {
    text = `${entry.post.title} ${entry.videoTitle}`;
  } else if (entry.item.kind === PlanItemKind.Task) {
    text = entry.item.task.title;
  } else if (entry.item.kind === PlanItemKind.Stage) {
    text = `${entry.item.stage.title} ${entry.item.song.title}`;
  } else if (entry.item.kind === PlanItemKind.OtherStage) {
    text = `${entry.item.stage.title} Другое`;
  } else {
    text = `${entry.item.stage.title} ${entry.item.video.title}`;
  }

  return text.toLocaleLowerCase().includes(query);
}
