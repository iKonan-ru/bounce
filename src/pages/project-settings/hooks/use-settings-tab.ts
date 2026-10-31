import { useLocation, useNavigate } from '@tanstack/react-router';

/** Вкладка сохраняется в адресе, в том числе для ссылок на причины блокировки */
export function useSettingsTab(projectId: string) {
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  let tab = 'general';

  if (hash.startsWith('video')) {
    tab = 'video';
  } else if (
    hash.startsWith('music') ||
    hash === 'project-links' ||
    hash === 'project-directions'
  ) {
    tab = 'music';
  }

  const onTabChange = (value: string): void => {
    void navigate({
      to: '/p/$projectId/settings',
      params: { projectId },
      hash: value,
      replace: true,
    });
  };

  return { tab, onTabChange };
}
