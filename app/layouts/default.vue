<script setup>
const open = ref(false);

const links = [
  [
    {
      label: "Turnos · Calendario",
      icon: "i-lucide-calendar-days",
      to: "/turnos/calendario",
    },
    {
      label: "Turnos · Tabla",
      icon: "i-lucide-table",
      to: "/turnos/tabla",
    },
  ],
  [
    {
      label: "Clientes",
      icon: "i-lucide-users",
      to: "/clientes",
    },
    {
      label: "Productos",
      icon: "i-lucide-box",
      to: "/productos",
    },
  ],
];
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
