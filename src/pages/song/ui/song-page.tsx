import { FileText, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Song } from '@/entities/song';
import {
  SONG_STATUS_LABEL,
  getSongStatus,
  getOrderedStages,
  SongCover,
  SongCoverSize,
} from '@/entities/song';
import type { PageHeaderEdit } from '@/shared/types';
import { Button, Loading, Section, PageHeader, Columns } from '@/shared/ui';
import { getDateLabel, getSafeUrl } from '@/shared/utils';
import { NotesFeed } from '@/widgets/notes';
import { SongPosts } from '@/widgets/posts';
import { ReleaseSection } from '@/widgets/song-release';
import { Link } from '@tanstack/react-router';
import { FACTS_SEPARATOR } from '../constants/song';
import { useSongPage } from '../hooks/use-song-page';
import type { SongLinksProps } from '../types/song';
import { StagesSection } from './stages-section';

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
