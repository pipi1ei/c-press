import type { Theme, EnhanceAppContext } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client';
import Layout from './Layout.vue';
import './styles.css';
import 'virtual:uno.css';
import '@shikijs/vitepress-twoslash/style.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue);
  },
} satisfies Theme;
