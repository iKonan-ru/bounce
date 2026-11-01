import type { ReactNode } from 'react';
import type { OtherStage } from '@/entities/other';
import type { User } from '@/entities/user';

/** Строка этапа раздела Другое */
export interface OtherStageRowProps {
  stage: OtherStage;
  projectId: string;
  handle: ReactNode;
  canEdit: boolean;
  people: Map<string, User>;
}
