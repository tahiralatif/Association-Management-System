import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started', 'registration', 'login'],
    },
    {
      type: 'category',
      label: 'Modules',
      items: [
        'modules/dashboard',
        'modules/members',
        'modules/finances',
        'modules/events',
        'modules/communications',
        'modules/elections',
        'modules/documents',
        'modules/workflows',
        'modules/ai-engine',
        'modules/analytics',
        'modules/integrations',
      ],
    },
    {
      type: 'category',
      label: 'Testing Guide',
      items: [
        'testing/overview',
        'testing/auth-flow',
        'testing/members',
        'testing/finances',
        'testing/events',
        'testing/communications',
        'testing/elections',
        'testing/documents',
        'testing/workflows',
        'testing/ai-engine',
        'testing/analytics',
        'testing/integrations',
        'testing/api',
      ],
    },
    {
      type: 'category',
      label: 'Administration',
      items: [
        'admin/user-roles',
        'admin/tenants',
        'admin/deployment',
      ],
    },
    'api-reference',
    'troubleshooting',
    'faq',
  ],
};

export default sidebars;
