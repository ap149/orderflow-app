<script setup>
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import LadderRow from './LadderRow.vue'
import { useLadderStore } from '../stores/ladder'

const ladderStore = useLadderStore()
</script>

<template>
  <RecycleScroller
    class="h-full w-full overflow-y-auto"
    :items="ladderStore.filledRows"
    :item-size="20"
    key-field="price"
  >
    <template #default="{ item }">
      <LadderRow
        :price="item.price"
        :from="item.from"
        :to="item.to"
        :vol="item.fromVol"
        :active="item.active"
        :highlight-to="item.highlightTo"
        :highlight-from="item.highlightFrom"
        :recent-rank="item.recentRank"
      />
    </template>
  </RecycleScroller>
</template>
