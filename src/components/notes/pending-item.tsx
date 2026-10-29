import { CloudOff, Mic, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Markup } from '@/components/markup';
import { fileKey, LocalImage, NoteAttachments } from '@/components/notes/attachments';
import { Button } from '@/components/ui/button';
import { dropPending, type PendingNote } from '@/lib/outbox';

// Заметка, которая ждёт отправки в очереди на устройстве (или которую сервер не принял).
export function PendingItem({ note }: { note: PendingNote }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <article className="px-4 py-3">
      <header className="flex items-center gap-2">
        <CloudOff className={note.rejected ? 'size-4 text-led-red' : 'size-4 text-led-amber'} />
        <p className={note.rejected ? 'flex-1 text-sm text-led-red' : 'flex-1 text-sm text-dim'}>
          {note.rejected ? 'Сервер не принял заметку' : 'Ждёт отправки'}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Удалить черновик"
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
        </Button>
      </header>
      {note.text && <Markup text={note.text} className="mt-2" />}
      <NoteAttachments
        images={note.images.map((f) => ({ key: fileKey(f), content: <LocalImage file={f} /> }))}
        audio={note.audio.map((f) => ({
          key: fileKey(f),
          content: (
            <>
              <Mic className="size-3.5 text-dim" />
              {f.name}
            </>
          ),
        }))}
        audioAs="names"
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Удалить черновик?"
        confirm="Удалить"
        onConfirm={() => {
          setConfirming(false);
          void dropPending(note.id);
        }}
      />
    </article>
  );
}
