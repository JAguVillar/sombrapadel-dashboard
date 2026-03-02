<script setup>
import { ScheduleXCalendar } from "@schedule-x/vue"
import { translations, mergeLocales } from "@schedule-x/translations"
import {
  createCalendar,
  createViewDay,
  createViewWeek,
  createViewList,
} from "@schedule-x/calendar"
import { createEventsServicePlugin } from "@schedule-x/events-service"
import "@schedule-x/theme-default/dist/index.css"
import { createCurrentTimePlugin } from "@schedule-x/current-time"

const {
  normalizePhoneForWaMe,
  buildConfirmationMessage,
  buildPaymentMessage,
  openWhatsappWeb,
} = useWhatsapp()

const ready = ref(false)
const calendarApp = shallowRef()
const open = ref(false)
const openFijo = ref(false)

const selectedDate = ref(null)
const selectedFrom = ref(null)
const selectedTo = ref(null)

const courts = ref([])
const clients = ref([])

const allEvents = ref([])
const selectedCourtSlug = ref("all")
const calendarSelectedDate = ref(null)

const courtButtons = computed(() => [
  { label: "Todas", value: "all" },
  ...(courts.value ?? []).map((c) => ({
    label: c.name ?? c.slug,
    value: c.slug,
  })),
])

defineShortcuts({
  o: () => (open.value = !open.value),
})

let eventsService

const TZ = "America/Argentina/Buenos_Aires"
const { loadRange, deleteBooking } = useBookings()
const { loadCourts } = useCourts()
const { loadClients } = useClients()

const scrollContainerRef = ref(null)

const slideoverOpen = ref(false)
const selectedEvent = ref(null)

function openSlideover(ev) {
  selectedEvent.value = ev ?? null
  slideoverOpen.value = true
}

function floorToHour(zdt) {
  return zdt.with({
    minute: 0,
    second: 0,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
  })
}

function applyCourtFilter() {
  if (!eventsService) return

  const filtered =
    selectedCourtSlug.value === "all"
      ? allEvents.value
      : allEvents.value.filter((e) => e.calendarId === selectedCourtSlug.value)

  eventsService.set(filtered)
}

function buildCalendarsFromCourts(courtsList) {
  const palette = [
    { main: "#22c55e", container: "#dcfce7", onContainer: "#052e16" },
    { main: "#3b82f6", container: "#dbeafe", onContainer: "#172554" },
    { main: "#f97316", container: "#ffedd5", onContainer: "#7c2d12" },
    { main: "#a855f7", container: "#f3e8ff", onContainer: "#3b0764" },
  ]

  return Object.fromEntries(
    (courtsList ?? []).map((c, idx) => {
      const hasDbColors =
        c.color_main && c.color_container && c.color_on_container

      const colors = hasDbColors
        ? {
            main: c.color_main,
            container: c.color_container,
            onContainer: c.color_on_container,
          }
        : palette[idx % palette.length]

      return [
        c.slug,
        {
          colorName: c.slug,
          lightColors: {
            main: colors.main,
            container: colors.container,
            onContainer: colors.onContainer,
          },
        },
      ]
    }),
  )
}

async function getBookingsWeek() {
  const events = await loadRange({})
  allEvents.value = events ?? []
  applyCourtFilter()
}

async function scrollToNow({ retries = 30, delay = 50 } = {}) {
  await nextTick()

  const container = scrollContainerRef.value
  if (!container) return

  const findNowLine = () =>
    container.querySelector(".sx__current-time-indicator") ||
    container.querySelector(".sx__current-time") ||
    container.querySelector('[class*="current-time"]')

  const doScroll = (nowLine) => {
    const cRect = container.getBoundingClientRect()
    const nRect = nowLine.getBoundingClientRect()
    const currentScroll = container.scrollTop
    const offsetInside = nRect.top - cRect.top + currentScroll
    const target = offsetInside - container.clientHeight / 2

    container.scrollTo({
      top: Math.max(0, target),
      behavior: "smooth",
    })
  }

  for (let i = 0; i < retries; i++) {
    const nowLine = findNowLine()
    if (nowLine) {
      requestAnimationFrame(() => doScroll(nowLine))
      return
    }
    await new Promise((r) => setTimeout(r, delay))
  }
}

async function createGalioPaymentLink({ amount, title, referenceId }) {
  const payload = {
    items: [
      {
        title,
        quantity: 1,
        unitPrice: amount,
        currencyId: "ARS",
      },
    ],
    referenceId,
    backUrl: {
      success: "https://tusitio.com/pago-exitoso",
      failure: "https://tusitio.com/pago-fallido",
    },
  }

  return await $fetch("/api/galio/payment-link", {
    method: "POST",
    body: payload,
  })
}

async function handleCreated(payload) {
  await getBookingsWeek()

  const client = clients.value.find((c) => c.id === payload?.clientId) ?? null
  const phoneDigits = normalizePhoneForWaMe(client?.phone)
  if (!phoneDigits) return

  const courtName =
    courts.value.find((c) => c.id === payload?.courtId)?.name ?? ""

  const confirmMessage = buildConfirmationMessage({
    clientName: client?.full_name ?? "",
    dateStr: payload?.date ?? "",
    from: payload?.from ?? "",
    to: payload?.to ?? "",
    courtName,
    typeName: "",
    title: payload?.title ?? "",
  })
  openWhatsappWeb(phoneDigits, confirmMessage)

  const amount = 3000

  if (!amount || amount <= 0) return

  const referenceId = payload?.bookingId
    ? `turno-${payload.bookingId}`
    : payload?.id
      ? `turno-${payload.id}`
      : `turno-${Date.now()}`

  let payment
  try {
    payment = await createGalioPaymentLink({
      amount,
      title: `Seña turno ${courtName}`,
      referenceId,
    })
  } catch (e) {
    console.error("Error creando link de pago Galio:", e)
    return
  }

  const paymentUrl = payment?.url
  if (!paymentUrl) return

  const payMessage = buildPaymentMessage({
    clientName: client?.full_name ?? "",
    dateStr: payload?.date ?? "",
    from: payload?.from ?? "",
    to: payload?.to ?? "",
    courtName,
    title: payload?.title ?? "",
    paymentUrl,
    amountLabel: `*$${amount}*`,
  })

  openWhatsappWeb(phoneDigits, payMessage)
}

async function deleteEvent(calendarEvent) {
  try {
    if (typeof deleteBooking === "function") {
      await deleteBooking(calendarEvent.id)
    }
  } catch (e) {
    console.error("Error borrando en backend:", e)
  }

  allEvents.value = (allEvents.value ?? []).filter(
    (e) => e.id !== calendarEvent.id,
  )
  applyCourtFilter()

  if (selectedEvent.value?.id === calendarEvent?.id) {
    slideoverOpen.value = false
    selectedEvent.value = null
  }
}

onMounted(async () => {
  calendarSelectedDate.value = globalThis.Temporal.Now.zonedDateTimeISO(TZ).toPlainDate()
  eventsService = createEventsServicePlugin()

  let loadedCourts = []
  try {
    loadedCourts = await loadCourts()
  } catch (e) {
    console.error("Error cargando courts:", e)
    loadedCourts = []
  }

  courts.value = loadedCourts ?? []
  const calendarsFromDb = buildCalendarsFromCourts(courts.value)

  try {
    clients.value = (await loadClients()) ?? []
  } catch (e) {
    console.error("Error cargando clients:", e)
    clients.value = []
  }

  calendarApp.value = createCalendar({
    locale: "es-ES",
    timezone: TZ,
    translations: mergeLocales(translations, {
      esES: {
        Week: "Semana",
        Today: "Hoy",
        Date: "Fecha",
        View: "Vista",
        Day: "Día",
        List: "Lista",
      },
    }),

    callbacks: {
      onClickDateTime(dateTime) {
        const start = floorToHour(dateTime)
        const end = start.add({ minutes: 60 })

        const date = `${start.year}-${String(start.month).padStart(2, "0")}-${String(start.day).padStart(2, "0")}`
        const from = `${String(start.hour).padStart(2, "0")}:00`
        const to = `${String(end.hour).padStart(2, "0")}:${String(end.minute).padStart(2, "0")}`

        selectedDate.value = date
        selectedFrom.value = from
        selectedTo.value = to

        open.value = true
      },

      onEventClick(event) {
        openSlideover(event)
      },
    },

    selectedDate: calendarSelectedDate.value,
    views: [createViewDay(), createViewWeek(), createViewList()],
    plugins: [eventsService, createCurrentTimePlugin()],

    calendars: calendarsFromDb,
    events: [],
  })

  try {
    await getBookingsWeek()
  } catch (e) {
    console.error("Error cargando bookings:", e)
  }

  ready.value = true

  scrollToNow()
  watch(ready, (v) => v && scrollToNow())

  watch(selectedCourtSlug, () => {
    applyCourtFilter()
  })
})
</script>

<template>
  <div class="min-h-0 flex flex-col">
    <TurnoDetailsSlideover
      v-model:open="slideoverOpen"
      :calendar-event="selectedEvent"
      @delete="deleteEvent"
    />

    <div
      class="sticky top-0 z-20 border-b border-default bg-background/90 backdrop-blur"
    >
      <div class="p-4 space-y-3">
        <!-- Fila 1: acciones -->
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <UButton
            label="Ir a hora actual"
            icon="i-lucide-clock"
            variant="outline"
            size="md"
            class="w-full sm:w-auto"
            @click="scrollToNow()"
          />

          <div class="flex gap-2">
            <UModal v-model:open="open">
              <UButton label="Cargar turno" icon="i-lucide-plus" size="md" class="flex-1 sm:flex-none" />
              <template #content>
                <TurnoCreateModal
                  :initial-date="selectedDate"
                  :initial-from="selectedFrom"
                  :initial-to="selectedTo"
                  @created="handleCreated"
                  @close="open = false"
                />
              </template>
            </UModal>

            <UModal v-model:open="openFijo">
              <UButton
                label="Cargar fijo"
                icon="i-lucide-calendar-clock"
                size="md"
                class="flex-1 sm:flex-none"
              />
              <template #content>
                <TurnoFijoCreateModal
                  :initial-date="selectedDate"
                  :initial-from="selectedFrom"
                  :initial-to="selectedTo"
                  @created="handleCreated"
                  @close="openFijo = false"
                />
              </template>
            </UModal>
          </div>
        </div>

        <!-- Fila 2: filtros -->
        <UFieldGroup
          label="Canchas"
          class="pt-2"
          :ui="{
            container: 'mt-1',
            description: 'text-xs',
          }"
        >
          <UButtonGroup class="flex flex-wrap gap-2 w-full sm:w-auto">
            <UButton
              v-for="b in courtButtons"
              :key="b.value"
              :label="b.label"
              :variant="selectedCourtSlug === b.value ? 'solid' : 'outline'"
              size="md"
              class="flex-1 sm:flex-none"
              @click="selectedCourtSlug = b.value"
            />
          </UButtonGroup>
        </UFieldGroup>
      </div>
    </div>

    <div ref="scrollContainerRef" class="min-h-0 flex-1 overflow-y-auto p-4">
      <ScheduleXCalendar v-if="ready" :calendar-app="calendarApp" />
    </div>
  </div>
</template>

<style>
.customClass {
  border-left: 4px solid #ef4444 !important;
}
</style>
