<template>
  <UDashboardPanel id="turnos-tabla">
    <template #header>
      <UDashboardNavbar title="Turnos · Tabla" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex items-center justify-center py-12 text-sm text-muted">
        Próximamente: vista de tabla de turnos.
      </div>
    </template>
  </UDashboardPanel>
</template>
