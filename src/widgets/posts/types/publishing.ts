import type { ChangeEvent } from 'react';
import type { ProjectLink } from '@/entities/project';
import type { Video } from '@/entities/video';
import type {
  VideoPost,
  VideoPromo,
  PublicationFields,
} from '@/entities/video-post';

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

export interface PromoDialogProps {
  projectId: string;
  template?: VideoPromo | undefined;
  canEdit: boolean;
  onClose: () => void;
}

export interface PublicationFieldsProps {
  fields: PublicationFields;
  scheduledAt?: string | undefined;
  accounts: ProjectLink[];
  disabled: boolean;
  onTextChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onAccountChange: (value: string) => void;
  onAnchorChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onOffsetChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface VideoPostRowProps {
  post: VideoPost;
  accountName: string;
  videoTitle?: string | undefined;
  onOpen: (id: string) => void;
}

export interface VideoPromoTemplateProps {
  projectId: string;
  canEdit: boolean;
}
