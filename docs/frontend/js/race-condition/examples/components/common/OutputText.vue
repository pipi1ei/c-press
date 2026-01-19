<script lang="ts" setup>
defineProps<{
  text: string;
}>();
</script>
<template>
  <div class="text-md">
    <span v-show="text">{{ text }}</span>
    <span v-show="!text" class="text-slate-500">请点击tab模拟请求服务端数据</span>
  </div>
</template>
