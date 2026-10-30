/** Переключатель выпуска внутри музыкального направления */
export interface MusicReleaseToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}
