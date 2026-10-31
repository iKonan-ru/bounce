import type { ChangeEvent } from 'react';
import type { ProjectLink } from '@/entities/project';
import type { Video } from '@/entities/video';
import type { VideoPost, PublicationFields } from '@/entities/video-post';

export interface VideoPublicationsProps {
  projectId: string;
  video?: Video | undefined;
  assigneeId?: string | undefined;
}

export interface PublicationDialogProps {
  projectId: string;
  videoId?: string | undefined;
  post?: VideoPost | undefined;
  canWork: boolean;
  onClose: () => void;
}

export interface PublicationFieldsProps {
  fields: PublicationFields;
  accounts: ProjectLink[];
  disabled: boolean;
  onTextChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onAccountChange: (value: string) => void;
  onDateChange: (value: string) => void;
}

export interface VideoPostRowProps {
  post: VideoPost;
  accountName: string;
  videoTitle?: string | undefined;
  onOpen: (id: string) => void;
}
