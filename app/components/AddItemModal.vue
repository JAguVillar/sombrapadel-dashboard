<script setup>
const emit = defineEmits(["add", "close"])
const { loadProducts } = useProducts()

const products = ref([])
const selected = ref(null)
const qty = ref(1)

onMounted(async () => {
  products.value = (await loadProducts()) ?? []
})

const items = computed(() =>
  products.value.map(p => ({ label: p.name, value: p.id }))
)

function getSelectedValue(v) {
  if (!v) return null
  if (typeof v === "object") return v.value
  return v
}

function add() {
  const productId = getSelectedValue(selected.value)
  if (!productId) return

  emit("add", { productId, qty: qty.value })
  selected.value = null
  qty.value = 1
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Agregar consumo</h3>
        <UButton icon="i-lucide-x" variant="ghost" @click="$emit('close')" />
      </div>
    </template>

    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <USelectMenu v-model="selected" :items="items" value-attribute="value" option-attribute="label" searchable
          :search-attributes="['label']" placeholder="Seleccioná un producto" class="w-full" clear />
        <div class="flex items-center gap-2">
          <UInputNumber v-model="qty" :min="1" :disabled="!selected" class="w-full sm:w-auto" />
        </div>
      </div>

      <UButton block :disabled="!selected" @click="add">
        Agregar
      </UButton>
    </div>
  </UCard>
</template>
