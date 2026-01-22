<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Turnos · Calendario" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <ScheduleCalendar />
    </template>
  </UDashboardPanel>
</template>
