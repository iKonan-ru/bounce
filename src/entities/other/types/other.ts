import type { Substep } from '@/entities/song';
import type { OtherStagesResponse } from '@/shared/api';

/** Этап раздела Другое */
export type OtherStage = OtherStagesResponse<Substep[]>;
