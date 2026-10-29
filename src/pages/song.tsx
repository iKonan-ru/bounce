import { ChevronRight, ListPlus, FileText, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useProjectCrumbs } from '@/components/crumbs';
import { NotesFeed } from '@/components/notes/notes-feed';
import { SongPosts } from '@/components/posts/song-posts';
import { ReleaseSection } from '@/components/release-section';
import {
  AvatarStack,
  getPeopleById,
  useProjectPeople,
  useAccess,
} from '@/entities/project';
import type { Song, SongStage, SongWithStages } from '@/entities/song';
import {
  SONG_STATUS_LABEL,
  getSongStatus,
  CLOSED_STAGE_STATUSES,
  StageStatus,
  TEXT_CLASS,
  StatusDot,
  STAGE_STATUS_LABEL,
  getSongProgress,
  templatesQuery,
  createStagesFromTemplate,
  reorderStages,
  Meter,
  MeterSize,
  songQuery,
  getOrderedStages,
  SongCover,
  SongCoverSize,
} from '@/entities/song';
import type { User } from '@/entities/user';
import { AddRow } from '@/features/mentions';
import {
  pb,
  queryKeys,
  getCollection,
  Collections,
  sendRecordForm,
} from '@/shared/api';
import { GROUP_ROWS } from '@/shared/constants';
import { useMe, useFileUrl, useImageUpload } from '@/shared/hooks';
import type {
  PageHeaderEdit,
  Crumb,
  NoteScope,
  PendingImage,
} from '@/shared/types';
import {
  SectionButton,
  Section,
  SortableList,
  Button,
  Loading,
  PageHeader,
  Columns,
} from '@/shared/ui';
import {
  getDateLabel,
  checkIsOverdue,
  cn,
  getNextPosition,
  moveItemById,
  warmImages,
  getSafeUrl,
} from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';

/** Поле формы, которое добавляет файл к обложкам песни */
const COVERS_APPEND_FIELD = 'covers+';

/** Большая копия обложки: шапка песни */
const COVER_THUMB_LARGE = '600x600';

/** Маленькая копия обложки: списки песен */
const COVER_THUMB_SMALL = '96x96';

/** Разделитель сведений в строке: точка посередине */
const FACTS_SEPARATOR = ' \u00B7 ';

/** Сведения о песне под заголовком: статус, темп, тональность и дата релиза */
function getSongFacts(song: Song): string[] {
  const facts = [SONG_STATUS_LABEL[getSongStatus(song)]];

  if (song.bpm) {
    facts.push(`${song.bpm} BPM`);
  }

  if (song.key) {
    facts.push(song.key);
  }

  if (song.target_release) {
    facts.push(`релиз ${getDateLabel(song.target_release)}`);
  }

  return facts;
}

/** Карандаш настроек песни в шапке: только редакторам */
function getHeaderEdit(
  canEdit: boolean,
  projectId: string,
  songId: string
): PageHeaderEdit | undefined {
  if (!canEdit) {
    return undefined;
  }

  return {
    link: {
      to: '/p/$projectId/songs/$songId/edit',
      params: { projectId, songId },
    },
    label: 'Настройки песни',
  };
}

/** Срок этапа прошёл, а этап не закрыт */
function checkIsStageLate(
  stage: Pick<SongStage, 'deadline' | 'status'>
): boolean {
  if (!stage.deadline) {
    return false;
  }

  if (CLOSED_STAGE_STATUSES.has(stage.status)) {
    return false;
  }

  return checkIsOverdue(stage.deadline);
}

/** Сведения строки этапа: сделано подэтапов и срок */
function getStageDetails(stage: SongStage): string[] {
  const substeps = stage.substeps ?? [];
  const details: string[] = [];

  if (substeps.length > 0) {
    const doneCount = substeps.filter((substep) => substep.done).length;
    details.push(`${doneCount}/${substeps.length}`);
  }

  if (stage.deadline) {
    details.push(`до ${getDateLabel(stage.deadline)}`);
  }

  return details;
}

/** Пропсы строки этапа */
interface SongStageRowProps {
  projectId: string;
  songId: string;
  stage: SongStage;
  /** Ручка перетаскивания из SortableList */
  handle: ReactNode;
  canEdit: boolean;
  /** Люди проекта по id: аватары исполнителей */
  people: Map<string, User>;
}

/** Данные строки этапа */
interface SongStageRowState {
  isLate: boolean;
  isSkipped: boolean;
  hasDetails: boolean;
  /** Сведения одной строкой: подэтапы и срок */
  detailsText: string;
  /** Исполнители этапа среди людей проекта */
  assignees: User[];
}

/** Сведения, срок и исполнители этапа для строки */
function getSongStageRowState(
  stage: SongStage,
  people: Map<string, User>
): SongStageRowState {
  const details = getStageDetails(stage);

  return {
    isLate: checkIsStageLate(stage),
    isSkipped: stage.status === StageStatus.skipped,
    hasDetails: details.length > 0,
    detailsText: details.join(FACTS_SEPARATOR),
    assignees: (stage.assignees ?? []).flatMap((id) => people.get(id) ?? []),
  };
}

/** Строка этапа: статус, название, сведения, исполнители; нажатие открывает этап */
function SongStageRow({
  projectId,
  songId,
  stage,
  handle,
  canEdit,
  people,
}: SongStageRowProps): ReactNode {
  const { isLate, isSkipped, hasDetails, detailsText, assignees } =
    getSongStageRowState(stage, people);
  const linkParams = { projectId, songId, stageId: stage.id };
  const rowClassName = cn(
    'group/row flex items-center transition-colors hover:bg-groove/30',
    {
      'pl-1': canEdit,
      'pl-4': !canEdit,
    }
  );
  const titleClassName = cn('block truncate', {
    'text-dim line-through': isSkipped,
  });
  const detailsClassName = cn('block truncate text-xs', {
    'text-led-red': isLate,
    'text-dim': !isLate,
  });
  const statusClassName = cn('shrink-0 text-sm', TEXT_CLASS[stage.status]);

  return (
    <div className={rowClassName}>
      {canEdit && handle}
      <Link
        to="/p/$projectId/songs/$songId/stages/$stageId"
        params={linkParams}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 md:min-h-11"
      >
        <StatusDot status={stage.status} />
        <span className="min-w-0 flex-1">
          <span className={titleClassName}>{stage.title}</span>
          {hasDetails && (
            <span className={detailsClassName}>{detailsText}</span>
          )}
        </span>
        <AvatarStack users={assignees} />
        <span className={statusClassName}>
          {STAGE_STATUS_LABEL[stage.status]}
        </span>
        <ChevronRight className="size-4 shrink-0 text-dim/60" />
      </Link>
    </div>
  );
}

/** Пропсы секции этапов */
interface StagesSectionProps {
  projectId: string;
  songId: string;
  stages: SongStage[];
  /** Состав и порядок этапов - редакторы; остальные только открывают этап */
  canEdit: boolean;
}

/** Состояние и действия секции этапов */
interface UseStagesSectionResult {
  people: Map<string, User>;
  doneCount: number;
  totalCount: number;
  /** Этапов нет, но их можно взять из шаблона проекта */
  canAddFromTemplate: boolean;
  isAddingFromTemplate: boolean;
  isAdding: boolean;
  onFromTemplateClick: () => void;
  onStageAdd: (title: string) => Promise<unknown>;
  onStagesReorder: (from: string, to: string) => void;
}

/** Этапы песни: добавление, этапы из шаблона и порядок */
function useStagesSection({
  projectId,
  songId,
  stages,
  canEdit,
}: StagesSectionProps): UseStagesSectionResult {
  const people = getPeopleById(useProjectPeople(projectId));
  const client = useQueryClient();
  const progress = getSongProgress(stages);
  const hasStages = stages.length > 0;
  // у песни нет этапов - их можно взять из шаблона проекта одной кнопкой
  const shouldLoadTemplates = canEdit && !hasStages;
  const templates = useQuery({
    ...templatesQuery(projectId),
    enabled: shouldLoadTemplates,
  });
  const templateList = templates.data ?? [];

  const fromTemplate = useMutation({
    mutationFn: (): Promise<unknown> =>
      createStagesFromTemplate(pb, songId, templateList),
    onSuccess: (): Promise<void> =>
      client.invalidateQueries({ queryKey: queryKeys.songs.all }),
    onError: () => {
      toast.error('Этапы не добавлены: проверьте соединение');
    },
  });

  const add = useMutation({
    mutationFn: (title: string): Promise<unknown> =>
      getCollection(pb, Collections.SongStages).create({
        song: songId,
        title,
        position: getNextPosition(stages),
        status: StageStatus.not_started,
        substeps: [],
      }),
    onSuccess: (): Promise<void> =>
      client.invalidateQueries({ queryKey: queryKeys.songs.all }),
    onError: () => {
      toast.error('Этап не добавлен: проверьте соединение');
    },
  });

  const onStagesReorder = (from: string, to: string): void => {
    void reorderStages(client, songId, moveItemById(stages, from, to)).catch(
      () => {
        toast.error('Порядок не сохранился: проверьте соединение');
      }
    );
  };

  const onFromTemplateClick = (): void => {
    fromTemplate.mutate();
  };

  const onStageAdd = (title: string): Promise<unknown> =>
    add.mutateAsync(title);

  const hasTemplates = templateList.length > 0;
  const canAddFromTemplate = canEdit && hasTemplates;

  return {
    people,
    doneCount: progress.done,
    totalCount: progress.total,
    canAddFromTemplate,
    isAddingFromTemplate: fromTemplate.isPending,
    isAdding: add.isPending,
    onFromTemplateClick,
    onStageAdd,
    onStagesReorder,
  };
}

/** Этапы песни: индикатор, список с перетаскиванием и добавление */
function StagesSection(props: StagesSectionProps): ReactNode {
  const { projectId, songId, stages, canEdit } = props;
  const {
    people,
    doneCount,
    totalCount,
    canAddFromTemplate,
    isAddingFromTemplate,
    isAdding,
    onFromTemplateClick,
    onStageAdd,
    onStagesReorder,
  } = useStagesSection(props);

  const hasStages = stages.length > 0;
  const isEmptyReadOnly = !canEdit && !hasStages;
  const templateIcon = <ListPlus />;
  const progressLabel = (
    <span className="text-sm text-dim tabular-nums">
      {doneCount} из {totalCount}
    </span>
  );
  const templateButton = canAddFromTemplate && (
    <SectionButton
      icon={templateIcon}
      disabled={isAddingFromTemplate}
      onClick={onFromTemplateClick}
    >
      Добавить этапы из шаблона
    </SectionButton>
  );
  const action = hasStages ? progressLabel : templateButton;

  const renderStageRow = (stage: SongStage, handle: ReactNode): ReactNode => (
    <SongStageRow
      projectId={projectId}
      songId={songId}
      stage={stage}
      handle={handle}
      canEdit={canEdit}
      people={people}
    />
  );

  return (
    <Section title="Этапы" action={action}>
      <div className={GROUP_ROWS}>
        {hasStages && (
          <div className="px-4 py-3.5">
            <Meter stages={stages} size={MeterSize.Large} />
          </div>
        )}
        {hasStages && (
          <SortableList
            items={stages}
            onReorder={onStagesReorder}
            disabled={!canEdit}
            className="divide-y divide-border/70 dark:divide-border/50"
            handleClassName="mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100"
          >
            {renderStageRow}
          </SortableList>
        )}
        {canEdit && (
          <AddRow
            id="new-stage"
            label="Добавить этап"
            isBusy={isAdding}
            onAdd={onStageAdd}
          />
        )}
        {isEmptyReadOnly && (
          <p className="px-4 py-3 text-sm text-dim">Этапов нет</p>
        )}
      </div>
    </Section>
  );
}

/** Пропсы кнопок под шапкой песни */
interface SongLinksProps {
  projectId: string;
  songId: string;
  /** Проверенная ссылка Bandlink; null - нет ссылки */
  bandlink: string | null;
}

/** Кнопки под шапкой: текст песни и Bandlink */
function SongLinks({ projectId, songId, bandlink }: SongLinksProps): ReactNode {
  const lyricsParams = { projectId, songId };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        className="h-9 px-3 max-sm:flex-1"
        asChild
      >
        <Link to="/p/$projectId/songs/$songId/lyrics" params={lyricsParams}>
          <FileText data-icon="inline-start" />
          Текст песни
        </Link>
      </Button>
      {bandlink && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-dim max-sm:flex-1 max-sm:bg-panel"
          asChild
        >
          <a href={bandlink} target="_blank" rel="noreferrer">
            <ExternalLink data-icon="inline-start" />
            Bandlink
          </a>
        </Button>
      )}
    </div>
  );
}

/** Состояние страницы песни */
interface UseSongPageResult {
  projectId: string;
  songId: string;
  crumbs: Crumb[];
  canEdit: boolean;
  canWork: boolean;
  meId: string | undefined;
  isPending: boolean;
  song: SongWithStages | undefined;
  notesScope: NoteScope;
  /** Загрузить первую обложку: нажатие на пустую обложку в шапке */
  onCoverPick: (file: File) => void;
  coverPending: PendingImage | undefined;
}

/** Песня, права и загрузка обложки из шапки */
function useSongPage(): UseSongPageResult {
  const { projectId, songId } = useParams({
    from: '/app/p/$projectId/songs/$songId',
  });
  const song = useQuery(songQuery(songId));
  const crumbs = useProjectCrumbs(projectId);
  const access = useAccess(projectId);
  const me = useMe();
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  // нажатие на пустую обложку в шапке - загрузка первой обложки
  const cover = useImageUpload(async (file, onProgress) => {
    const form = new FormData();
    form.append(COVERS_APPEND_FIELD, file);
    const next = await sendRecordForm<Song>(Collections.Songs, form, {
      id: songId,
      onProgress,
    });
    const added = next.covers.at(-1);
    await warmImages([
      fileUrl(next, added, COVER_THUMB_LARGE),
      fileUrl(next, added, COVER_THUMB_SMALL),
    ]);
    await client.invalidateQueries({ queryKey: queryKeys.songs.all });
  }, 'Обложка не загрузилась: проверьте соединение');

  return {
    projectId,
    songId,
    crumbs,
    canEdit: access.canEdit,
    canWork: access.canWork,
    meId: me?.id,
    isPending: song.isPending,
    song: song.data,
    notesScope: { project: projectId, song: songId },
    onCoverPick: cover.pick,
    coverPending: cover.pending,
  };
}

/** Песня: этапы, публикации, релиз и заметки */
export function SongPage(): ReactNode {
  const {
    projectId,
    songId,
    crumbs,
    canEdit,
    canWork,
    meId,
    isPending,
    song,
    notesScope,
    onCoverPick,
    coverPending,
  } = useSongPage();

  if (isPending) {
    return <Loading className="h-40 rounded-xl" />;
  }

  if (!song) {
    return <p className="text-led-red">Песня не найдена или нет соединения.</p>;
  }

  // только http(s): адрес приходит из записи, а не из формы
  const bandlink = getSafeUrl(song.bandlink ?? '');
  const factsText = getSongFacts(song).join(FACTS_SEPARATOR);
  const headerEdit = getHeaderEdit(canEdit, projectId, songId);
  const stages = getOrderedStages(song);

  const cover = (
    <SongCover
      song={song}
      size={SongCoverSize.Large}
      isInteractive
      onPick={onCoverPick}
      pending={coverPending}
    />
  );
  const links = (
    <SongLinks projectId={projectId} songId={songId} bandlink={bandlink} />
  );

  const main = (
    <div className="flex flex-col gap-8">
      <StagesSection
        projectId={projectId}
        songId={songId}
        stages={stages}
        canEdit={canEdit}
      />
      <SongPosts song={song} meId={meId} canWork={canWork} />
    </div>
  );

  const side = (
    <div className="flex flex-col gap-8">
      <ReleaseSection projectId={projectId} song={song} isEditable={canEdit} />
      <Section title="Заметки">
        <NotesFeed scope={notesScope} />
      </Section>
    </div>
  );

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        media={cover}
        title={song.title}
        edit={headerEdit}
        meta={factsText}
        below={links}
      />
      <Columns main={main} side={side} />
    </>
  );
}
