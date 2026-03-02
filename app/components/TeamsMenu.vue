<script setup>
defineProps({
  collapsed: { type: Boolean, default: false },
})
</script>

<template>
  <div class="flex items-center gap-2 px-2 py-1.5">
    <UIcon name="i-lucide-volleyball" class="size-5 shrink-0" />
    <span v-if="!collapsed" class="font-semibold truncate text-sm">
      Sombra Padel
    </span>
  </div>
</template>
