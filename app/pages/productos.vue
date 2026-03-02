<script setup>
import { UButton, USwitch } from "#components"

const { loadProducts, deleteProduct } = useProducts()
const toast = useToast()

const loading = ref(false)
const rows = ref([])

const openCreate = ref(false)

const openConfirmDelete = ref(false)
const productToDelete = ref(null)
const deleting = ref(false)

function getProductName(product) {
  return product?.name || "este producto"
}

function onEdit(product) {
  console.log("edit", product)
}

function onDelete(product) {
  productToDelete.value = product
  openConfirmDelete.value = true
}

async function confirmDelete() {
  if (!productToDelete.value || deleting.value) return

  deleting.value = true
  try {
    await deleteProduct(productToDelete.value.id)

    toast.add({
      title: "Producto eliminado",
      description: "Se eliminó correctamente",
      color: "success",
    })

    openConfirmDelete.value = false
    productToDelete.value = null

    await getProductos()
  } catch (e) {
    console.error(e)
    toast.add({
      title: "Error",
      description: "No se pudo eliminar el producto",
      color: "error",
    })
  } finally {
    deleting.value = false
  }
}

const columns = computed(() => [
  {
    accessorKey: "name",
    header: "Producto",
  },
  {
    accessorKey: "price",
    header: "Precio",
  },
  {
    accessorKey: "track_stock",
    header: "Trackeable",
    cell: ({ row }) =>
      h(USwitch, {
        modelValue: Boolean(row.getValue("track_stock")),
        disabled: true,
      }),
  },
  {
    accessorKey: "active",
    header: "Activo",
    cell: ({ row }) =>
      h(USwitch, {
        modelValue: Boolean(row.getValue("active")),
        disabled: true,
      }),
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => {
      const product = row.original
      return h("div", { class: "flex items-center justify-end gap-1" }, [
        h(UButton, {
          icon: "i-lucide-pencil",
          size: "xs",
          variant: "ghost",
          onClick: () => onEdit(product),
        }),
        h(UButton, {
          icon: "i-lucide-trash",
          size: "xs",
          variant: "ghost",
          color: "error",
          onClick: () => onDelete(product),
        }),
      ])
    },
  },
])

async function getProductos() {
  loading.value = true
  try {
    const products = await loadProducts()
    rows.value = products ?? []
  } finally {
    loading.value = false
  }
}

onMounted(getProductos)
</script>

<template>
  <UDashboardPanel id="productos">
    <template #header>
      <UDashboardNavbar title="Productos" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-3 px-4 py-3.5 border-b border-accented sm:flex-row sm:items-center sm:justify-between">
        <UInput class="w-full sm:max-w-sm" placeholder="Buscar..." />

        <UModal v-model:open="openCreate">
          <UButton label="Cargar producto" icon="i-lucide-plus" size="md" class="w-full sm:w-auto" />
          <template #content>
            <ProductosProductoCreateModal
              @created="getProductos()"
              @close="openCreate = false"
            />
          </template>
        </UModal>
      </div>

      <BaseTable :rows="rows" :columns="columns" :loading="loading" />

      <ConfirmModal
        v-model:open="openConfirmDelete"
        title="Eliminar producto"
        :item-name="getProductName(productToDelete)"
        :loading="deleting"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>
