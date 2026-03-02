<script setup>
defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: "Sin resultados" },
});
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto">
      <UTable :data="rows" :columns="columns" :loading="loading" class="flex-1" />
    </div>
    <div
      v-if="!loading && rows.length === 0"
      class="py-6 text-center text-sm text-gray-500"
    >
      {{ emptyText }}
    </div>

    <slot name="footer" />
  </div>
</template>
