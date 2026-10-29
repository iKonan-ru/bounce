import type { Bucket } from '@/shared/types';
import type { PlanItem, PlanItemKind } from './plan';

/** Пропсы строки плана */
export interface PlanRowProps {
  item: PlanItem;
  bucket: Bucket;
  projectId: string;
  /** Можно отмечать и править */
  canWork: boolean;
  /** Открыть окно пункта плана */
  onOpen: (kind: PlanItemKind, id: string) => void;
}
