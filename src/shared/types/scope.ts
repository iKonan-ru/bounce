/** Где заметка: у проекта, песни или этапа (песня и этап - того же проекта) */
export interface NoteScope {
  project: string;
  song?: string;
  stage?: string;
  other?: boolean;
  project_task?: string;
  other_stage?: string;
  video?: string;
  video_stage?: string;
}
