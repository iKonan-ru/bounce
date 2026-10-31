import type { Song, SongStage } from '@/entities/song';
import type { User } from '@/entities/user';
import type { Video, VideoStage } from '@/entities/video';
import type { NotesResponse } from '@/shared/api';

export type Note = NotesResponse<
  string[],
  {
    author?: User;
    song?: Song;
    stage?: SongStage;
    video?: Video;
    video_stage?: VideoStage;
  }
>;
