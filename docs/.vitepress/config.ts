import { defineConfig } from 'vitepress';
import { getSidebarConfig } from './utils';

const BASE_DIR = '/c-press/';
export default defineConfig({
  title: 'c-press',
  description: '由VitePress驱动的个人博客站点',
  base: BASE_DIR,
  head: [['link', { rel: 'icon', href: `${BASE_DIR}favicon.svg` }]],
  themeConfig: {
    logo: '/vitepress-logo.svg',

    search: {
      provider: 'local',
    },

    nav: [
      { text: 'Home', link: '/' },
      {
        text: '前端',
        items: [
          { text: 'JavaScript', link: '/frontend/js/race-condition' },
          { text: 'Vue', link: '/frontend/vue/reactivity' },
        ],
        activeMatch: '/frontend/',
      },
      { text: 'AI', link: '/ai/basic/prompt', activeMatch: '/ai/' },
    ],

    sidebar: {
      '/frontend/': [
        {
          text: 'JavaScript',
          items: [{ text: '竞态问题', link: '/frontend/js/race-condition' }],
        },
        {
          text: 'Vue',
          items: [{ text: '响应式原理', link: '/frontend/vue/reactivity' }],
        },
      ],
      '/ai/': [{ text: '提示词工程', link: '/ai/basic/prompt' }],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/pipi1ei/c-press' }],

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright ©2025-present chenlei',
    },
  },
  lastUpdated: true,
});
