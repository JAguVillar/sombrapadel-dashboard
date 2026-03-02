<script setup>
import { UButton } from "#components"

const { loadClients, deleteClient } = useClients()
const toast = useToast()

const loading = ref(false)
const rows = ref([])

const openCreate = ref(false)

const openConfirmDelete = ref(false)
const clientToDelete = ref(null)
const deleting = ref(false)

function getClientName(client) {
  return (
    client?.full_name ||
    `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim() ||
    "este cliente"
  )
}

function onEdit(client) {
  console.log("edit", client)
}

function onDelete(client) {
  clientToDelete.value = client
  openConfirmDelete.value = true
}

async function confirmDelete() {
  if (!clientToDelete.value || deleting.value) return

  deleting.value = true
  try {
    await deleteClient(clientToDelete.value.id)

    toast.add({
      title: "Cliente eliminado",
      description: "Se eliminó correctamente",
      color: "success",
    })

    openConfirmDelete.value = false
    clientToDelete.value = null

    await getClients()
  } catch (e) {
    console.error(e)
    toast.add({
      title: "Error",
      description: "No se pudo eliminar el cliente",
      color: "error",
    })
  } finally {
    deleting.value = false
  }
}

const columns = computed(() => [
  {
    accessorKey: "full_name",
    header: "Cliente",
    cell: ({ row }) =>
      row.getValue("full_name") ||
      `${row.getValue("first_name") ?? ""} ${row.getValue("last_name") ?? ""}`.trim(),
  },
  {
    accessorKey: "phone",
    header: "Teléfono",
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => {
      const client = row.original
      return h("div", { class: "flex items-center justify-end gap-1" }, [
        h(UButton, {
          icon: "i-lucide-pencil",
          size: "xs",
          variant: "ghost",
          onClick: () => onEdit(client),
        }),
        h(UButton, {
          icon: "i-lucide-trash",
          size: "xs",
          variant: "ghost",
          color: "error",
          onClick: () => onDelete(client),
        }),
      ])
    },
  },
])

async function getClients() {
  loading.value = true
  try {
    const clients = await loadClients()
    rows.value = clients ?? []
  } finally {
    loading.value = false
  }
}

onMounted(getClients)
</script>

<template>
  <UDashboardPanel id="clientes">
    <template #header>
      <UDashboardNavbar title="Clientes" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-3 px-4 py-3.5 border-b border-accented sm:flex-row sm:items-center sm:justify-between">
        <UInput class="w-full sm:max-w-sm" placeholder="Buscar..." />

        <UModal v-model:open="openCreate">
          <UButton label="Cargar cliente" icon="i-lucide-plus" size="md" class="w-full sm:w-auto" />
          <template #content>
            <ClientesClienteCreateModal
              @created="getClients()"
              @close="openCreate = false"
            />
          </template>
        </UModal>
      </div>

      <BaseTable :rows="rows" :columns="columns" :loading="loading" />

      <ConfirmModal
        v-model:open="openConfirmDelete"
        title="Eliminar cliente"
        :item-name="getClientName(clientToDelete)"
        :loading="deleting"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>
