/** Где заметка: у проекта, песни или этапа (песня и этап - того же проекта) */
export interface NoteScope {
  project: string;
  song?: string;
  stage?: string;
}
