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
import { getDateLabel, getSafeUrl, cn } from '@/shared/utils';
import { NotesFeed } from '@/widgets/notes';
import { SongPosts } from '@/widgets/posts';
import { ReleaseSection } from '@/widgets/song-release';
import { Link } from '@tanstack/react-router';
import { FACTS_SEPARATOR } from '../constants/song';
import { useSongPage } from '../hooks/use-song-page';
import type { SongLinksProps } from '../types/song';
import { RelatedVideos } from './related-videos';
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

/** Кнопка настроек песни в шапке: только редакторам */
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

/** На десктопе - ссылки справа от названия, на мобильном - кнопки под шапкой. */
function SongLinks({
  projectId,
  songId,
  bandlink,
  isDesktop,
}: SongLinksProps): ReactNode {
  const lyricsParams = { projectId, songId };
  const linksClassName = isDesktop
    ? 'flex flex-col items-end gap-0.5 pt-6 xl:flex-row xl:gap-1'
    : 'flex flex-wrap gap-2';
  const lyricsVariant = isDesktop ? 'ghost' : 'secondary';
  const lyricsClassName = cn('h-9 px-3 max-sm:flex-1', {
    'font-normal text-dim hover:text-ink': isDesktop,
  });
  const bandlinkClassName = cn(
    'h-9 px-3 text-dim max-sm:flex-1 max-sm:bg-panel',
    {
      'font-normal hover:text-ink': isDesktop,
    }
  );

  return (
    <div className={linksClassName}>
      <Button
        variant={lyricsVariant}
        size="sm"
        className={lyricsClassName}
        asChild
      >
        <Link to="/p/$projectId/songs/$songId/lyrics" params={lyricsParams}>
          <FileText data-icon="inline-start" />
          Текст песни
        </Link>
      </Button>
      {bandlink && (
        <Button variant="ghost" size="sm" className={bandlinkClassName} asChild>
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
    isDesktop,
    projectId,
    songId,
    crumbs,
    canEdit,
    isReleaseEnabled,
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
    <SongLinks
      projectId={projectId}
      songId={songId}
      bandlink={bandlink}
      isDesktop={isDesktop}
    />
  );

  const main = (
    <div className="flex flex-col gap-8">
      <StagesSection
        projectId={projectId}
        songId={songId}
        stages={stages}
        canEdit={canEdit}
      />
      <RelatedVideos projectId={projectId} songId={songId} />
      {isReleaseEnabled && (
        <SongPosts song={song} meId={meId} canWork={canWork} />
      )}
    </div>
  );

  const side = (
    <div className="flex flex-col gap-8">
      {isReleaseEnabled && (
        <ReleaseSection
          projectId={projectId}
          song={song}
          isEditable={canEdit}
        />
      )}
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
        below={isDesktop ? undefined : links}
        actions={isDesktop ? links : undefined}
      />
      <Columns main={main} side={side} />
    </>
  );
}
