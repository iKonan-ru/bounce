import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { DateField } from '@/components/date-field';
import { GROUP_ROWS } from '@/components/page';
import { PeoplePicker } from '@/components/people-picker';
import { PropRow } from '@/components/prop-row';
import { StageStatusPicker, StatusDot } from '@/components/stage-status';
import { SubstepsEditor } from '@/components/substeps';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { errorText, SAVE_FAILED } from '@/lib/errors';
import type { Song, SongStage, Substep } from '@/lib/model';
import { bucketOf } from '@/lib/plan';
import { type StagePatch, updateStage } from '@/lib/stages';

// Этап из плана: статус, кто делает, срок и подэтапы - не уходя со страницы плана.
export function StageDialog({
  stage,
  song,
  projectId,
  canWork,
  open,
  onOpenChange,
}: {
  stage: SongStage;
  song: Song;
  projectId: string;
  canWork: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const client = useQueryClient();
  const save = (patch: StagePatch) =>
    void updateStage(client, song.id, stage.id, patch).catch((e) =>
      toast.error(errorText(e, SAVE_FAILED)),
    );
  const subs = stage.substeps ?? [];
  const late =
    stage.status !== 'done' &&
    stage.status !== 'skipped' &&
    bucketOf(stage.deadline ?? '', new Date()) === 'overdue';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <div className="flex items-start gap-2 pr-8">
            <span className="flex size-8 shrink-0 items-center justify-center">
              <StatusDot status={stage.status} />
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-lg leading-8 font-medium text-pretty">
                {stage.title}
              </DialogTitle>
              <p className="text-sm text-dim">{song.title}</p>
            </div>
          </div>
        </DialogHeader>
        <div className={GROUP_ROWS}>
          <PropRow label="Статус">
            <StageStatusPicker
              value={stage.status}
              readOnly={!canWork}
              onChange={(status) => save({ status })}
            />
          </PropRow>
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={projectId}
              value={stage.assignees ?? []}
              disabled={!canWork}
              onChange={(assignees) => save({ assignees })}
            />
          </PropRow>
          <PropRow label="Срок">
            <DateField
              quiet
              disabled={!canWork}
              value={stage.deadline ?? ''}
              danger={late}
              placeholder="Без срока"
              onChange={(deadline) => save({ deadline })}
            />
          </PropRow>
        </div>
        {(canWork || subs.length > 0) && (
          <SubstepsEditor
            idPrefix={`plan-${stage.id}`}
            projectId={projectId}
            checkable
            readOnly={!canWork}
            items={subs}
            onChange={(items) =>
              save({
                substeps: items.map(
                  (x): Substep => ({ id: x.id, title: x.title, done: x.done === true }),
                ),
              })
            }
          />
        )}
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button variant="ghost" className="-ml-3.5 text-dim" asChild>
            <Link
              to="/p/$projectId/songs/$songId/stages/$stageId"
              params={{ projectId, songId: song.id, stageId: stage.id }}
            >
              Открыть этап
              <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Готово
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
