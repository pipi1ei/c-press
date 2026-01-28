import { defineConfig } from 'unocss';

export default defineConfig({
  shortcuts: {
    'example-container': 'p-3 rounded border border-solid border-slate-300',
    'example-button':
      'py-1 px-2 rounded border border-solid border-[#d9d9d9] cursor-pointer hover:border-[#1677ff] hover:text-[#1677ff]',
  },
});
