<script setup>
defineProps({
  collapsed: { type: Boolean, default: false },
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const displayName = computed(() => {
  if (!user.value) return ""
  return user.value.user_metadata?.full_name || user.value.email || ""
})

const displayEmail = computed(() => user.value?.email || "")

const menuItems = [
  [
    {
      label: "Cerrar sesión",
      icon: "i-lucide-log-out",
      onSelect: logout,
    },
  ],
]

async function logout() {
  await supabase.auth.signOut()
  await navigateTo("/login")
}
</script>

<template>
  <UDropdownMenu :items="menuItems">
    <UButton
      :label="collapsed ? undefined : displayName"
      :icon="collapsed ? 'i-lucide-user' : undefined"
      variant="ghost"
      color="neutral"
      block
      :class="collapsed ? 'justify-center' : 'justify-start'"
      :ui="{ label: 'truncate' }"
    >
      <template v-if="!collapsed" #leading>
        <UAvatar :alt="displayName" size="2xs" />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
