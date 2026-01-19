import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import Layout from './Layout.vue';
import './styles.css';
import 'virtual:uno.css';

export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme;
