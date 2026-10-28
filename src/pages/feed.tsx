import { useParams } from '@tanstack/react-router';
import { NotesFeed } from '@/components/notes-feed';

// Лента проекта: идеи и комментарии, не привязанные к песне.
export function FeedPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/feed' });
  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Лента</h1>
      <NotesFeed
        scope={{ project: projectId }}
        empty="Идеи для новых песен и общие комментарии по проекту: текстом, с аудио и фото."
      />
    </section>
  );
}
