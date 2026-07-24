import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'AssocHub Documentation',
  tagline: 'The Complete Guide to AI-Powered Association Management',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.ams.14.jugaar.ai',
  baseUrl: '/',

  organizationName: 'tahiralatif',
  projectName: 'Association-Management-System',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: 'AssocHub',
      logo: {
        alt: 'AssocHub Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://ams.14.jugaar.ai',
          label: 'Live Demo',
          position: 'right',
        },
        {
          href: 'https://github.com/tahiralatif/Association-Management-System',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/' },
            { label: 'Quick Start Guide', to: '/getting-started' },
            { label: 'Feature Testing', to: '/testing/overview' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/tahiralatif/Association-Management-System' },
            { label: 'Live Demo', href: 'https://ams.14.jugaar.ai' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AssocHub. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'python', 'json', 'yaml', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
