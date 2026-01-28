<script lang="ts" setup>
import { reactive } from 'vue';

const state = reactive({ count: 0 });
const handleClick = () => {
  state.count++;
};
</script>

<template>
  <div class="example-container">
    <p class="m-0">count is: {{ state.count }}</p>
    <button class="example-button" @click="handleClick">add count</button>
  </div>
</template>
