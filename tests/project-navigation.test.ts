import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@/entities/project';
import { projectsQuery } from '@/entities/project';
import { useWorkspaceNavigation } from '@/features/workspace-navigation';
import type * as SharedHooks from '@/shared/hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as TanStackRouter from '@tanstack/react-router';
import { useTabBar } from '../src/widgets/app-shell/hooks/use-tab-bar';
import type { TabBarProps } from '../src/widgets/app-shell/types/app-shell';
import { ProjectSection } from '../src/widgets/app-shell/types/app-shell';

vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof SharedHooks>()),
  useMe: () => ({ id: 'me' }),
  useMediaQuery: () => true,
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof TanStackRouter>()),
  useNavigate: () => vi.fn(),
}));

/** Минимальное описание доступного или закрытого проекта */
function createProject(id: string, owner = 'me'): Project {
  return { id, owner, name: id, directions: ['music'] } as Project;
}

/** Проверяем реальные ссылки, построенные мобильной навигацией */
function Navigation(props: TabBarProps) {
  const tabs = useTabBar(props);

  return createElement(
    'nav',
    {},
    tabs.map((tab) =>
      createElement(
        'a',
        {
          key: tab.label,
          href:
            'params' in tab.link
              ? tab.link.to.replace('$projectId', tab.link.params.projectId)
              : tab.link.to,
          'aria-current': tab.isCurrent ? 'page' : undefined,
        },
        tab.label
      )
    )
  );
}

/** В мобильном переключателе доступны только проекты */
function ProjectSelector() {
  const { projectOptions } = useWorkspaceNavigation('notes');

  return createElement(
    'select',
    {},
    projectOptions.map((option) =>
      createElement(
        'option',
        { key: option.value, value: option.value },
        option.label
      )
    )
  );
}

/** Изолированный кэш без запросов к серверу */
function renderNavigation(props: TabBarProps, projects: Project[]): string {
  const client = new QueryClient();
  client.setQueryData(projectsQuery.queryKey, projects);
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(Navigation, props)
    )
  );
  client.clear();

  return html;
}

afterEach(() => vi.unstubAllGlobals());

describe('навигация только внутри проектов', () => {
  it('музыка, план и заметки открываются в текущем проекте, а не в ранее выбранном', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'old' });
    const projects = [createProject('current'), createProject('old')];
    for (const section of [
      ProjectSection.Songs,
      ProjectSection.Plan,
      ProjectSection.Notes,
    ]) {
      const html = renderNavigation(
        { projectId: 'current', section, pathname: `/p/current/${section}` },
        projects
      );
      expect(html).toContain('href="/p/current/songs"');
      expect(html).toContain('href="/p/current/plan"');
      expect(html).toContain('href="/p/current/notes"');
      expect(html).toContain('href="/projects">current</a>');
      expect(html).not.toContain('/p/old/');
    }
  });

  it('вне проекта использует последний доступный проект', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'last' });
    const html = renderNavigation(
      { projectId: undefined, section: undefined, pathname: '/projects' },
      [createProject('last')]
    );
    expect(html).toContain('href="/p/last/plan"');
    expect(html).toContain('href="/p/last/notes"');
    expect(html).toContain('href="/projects" aria-current="page">last</a>');
  });

  it('без выбранного проекта или после отзыва доступа ведет к выбору проекта', () => {
    for (const remembered of [null, 'closed']) {
      vi.stubGlobal('localStorage', { getItem: () => remembered });
      const html = renderNavigation(
        { projectId: undefined, section: undefined, pathname: '/projects' },
        [createProject('closed', 'other')]
      );
      expect(html.match(/href="\/projects"/g)).toHaveLength(3);
      expect(html).toContain('>Проекты</a>');
      expect(html).not.toContain('href="/plan');
      expect(html).not.toContain('href="/notes');
    }
  });

  it('показывает отдельные вкладки только для включенных направлений', () => {
    for (const directions of [
      [],
      ['music'],
      ['video'],
      ['music', 'video'],
      ['other'],
      ['music', 'video', 'other'],
    ] as const) {
      const project = {
        ...createProject('current'),
        directions: [...directions],
      };
      const html = renderNavigation(
        {
          projectId: 'current',
          section: ProjectSection.Plan,
          pathname: '/p/current/plan',
        },
        [project]
      );
      expect(html.includes('>Музыка</a>')).toBe(
        directions.some((direction) => direction === 'music')
      );
      expect(html.includes('>Видео</a>')).toBe(
        directions.some((direction) => direction === 'video')
      );
      expect(html.includes('>Задачи</a>')).toBe(
        directions.some((direction) => direction === 'other')
      );
      expect(html).not.toContain('Материалы');
      expect(html.match(/<a /g)).toHaveLength(3 + directions.length);
    }
  });

  it('подсвечивает музыку и видео независимо, включая вложенные страницы', () => {
    const project = {
      ...createProject('current'),
      directions: ['music', 'video'] as Project['directions'],
    };
    for (const [section, label] of [
      [ProjectSection.Songs, 'Музыка'],
      [ProjectSection.Videos, 'Видео'],
    ] as const) {
      const html = renderNavigation(
        {
          projectId: 'current',
          section,
          pathname: `/p/current/${section}/item`,
        },
        [project]
      );
      expect(html).toContain(`aria-current="page">${label}</a>`);
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
      expect(html).toContain('href="/p/current/songs"');
      expect(html).toContain('href="/p/current/videos"');
    }
    const settings = renderNavigation(
      {
        projectId: 'current',
        section: ProjectSection.Settings,
        pathname: '/p/current/settings',
      },
      [project]
    );
    expect(settings).not.toContain('aria-current="page"');
  });

  it('переключатель не содержит личного пространства и недоступных проектов', () => {
    const client = new QueryClient();
    client.setQueryData(projectsQuery.queryKey, [
      createProject('available'),
      createProject('closed', 'other'),
    ]);
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(ProjectSelector)
      )
    );
    client.clear();
    expect(html).toContain('value="available"');
    expect(html).not.toContain('value=""');
    expect(html).not.toContain('closed');
    expect(html).not.toContain('Личное');
  });
});
