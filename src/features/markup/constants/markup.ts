import { Music2, Play, HardDrive, FileText, Send } from 'lucide-react';
import type { LinkIconRule } from '../types/markup';

/** Значки ссылок по сервису: музыка, видео, файлы, документы, Telegram; берётся первое совпадение */
export const LINK_ICON_RULES: readonly LinkIconRule[] = [
  {
    pattern:
      /^(Spotify|Яндекс Музыка|Apple Music|SoundCloud|Bandlink|YouTube Music|Suno)/,
    icon: Music2,
  },
  { pattern: /^(YouTube|TikTok|Instagram|VK)/, icon: Play },
  { pattern: /^(Яндекс Диск|Google Диск|Dropbox)/, icon: HardDrive },
  { pattern: /^Google Документы/, icon: FileText },
  { pattern: /^Telegram/, icon: Send },
];
