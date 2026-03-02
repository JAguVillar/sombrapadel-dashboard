export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  const publicRoutes = ['/login', '/confirm']
  const isPublic = publicRoutes.some((r) => to.path.startsWith(r))

  // No session + protected route → go to login
  if (!user.value && !isPublic) {
    return navigateTo('/login')
  }

  // Active session + login page → go to dashboard
  if (user.value && to.path === '/login') {
    return navigateTo('/turnos/calendario')
  }
})
