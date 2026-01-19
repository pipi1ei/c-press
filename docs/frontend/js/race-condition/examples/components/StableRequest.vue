<script lang="ts" setup>
import { ref } from 'vue';
import FixedTabs from './common/FixedTabs.vue';
import OutputText from './common/OutputText.vue';
import { requestA } from '../utils/request';
import { TabName } from '../utils/constants';

const clickTab = async (str: TabName) => {
  itemStr.value = await requestA(str);
};
const itemStr = ref('');
</script>

<template>
  <div class="p-5">
    <FixedTabs @click="clickTab" />
    <OutputText :text="itemStr" />
  </div>
</template>
