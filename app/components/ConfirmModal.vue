<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "Confirmar acción" },
  message: { type: String, default: null },
  itemName: { type: String, default: null },
  confirmLabel: { type: String, default: "Eliminar" },
  cancelLabel: { type: String, default: "Cancelar" },
  confirmColor: { type: String, default: "error" },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(["update:open", "confirm", "cancel"])

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit("update:open", v),
})

function onCancel() {
  emit("cancel")
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ title }}</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              :disabled="loading"
              @click="onCancel"
            />
          </div>
        </template>

        <div class="space-y-2">
          <p class="text-sm">
            <slot>
              <template v-if="itemName">
                ¿Seguro que querés eliminar
                <span class="font-medium">{{ itemName }}</span>?
              </template>
              <template v-else-if="message">
                {{ message }}
              </template>
            </slot>
          </p>
          <p class="text-xs text-muted">
            Esta acción no se puede deshacer.
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="outline"
              color="neutral"
              :disabled="loading"
              @click="onCancel"
            >
              {{ cancelLabel }}
            </UButton>
            <UButton
              :color="confirmColor"
              :loading="loading"
              @click="$emit('confirm')"
            >
              {{ confirmLabel }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
