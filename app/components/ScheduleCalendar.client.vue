<script setup>
import { shallowRef, ref, onMounted, nextTick, watch, computed } from "vue";
import { ScheduleXCalendar } from "@schedule-x/vue";
import { translations, mergeLocales } from "@schedule-x/translations";
import {
  createCalendar,
  createViewDay,
  createViewWeek,
  createViewList,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "@schedule-x/theme-default/dist/index.css";
import { createEventModalPlugin } from "@schedule-x/event-modal";
import { createCurrentTimePlugin } from "@schedule-x/current-time";

const ready = ref(false);
const calendarApp = shallowRef();
const open = ref(false);
const eventModal = createEventModalPlugin();

const selectedDate = ref(null);
const selectedFrom = ref(null);
const selectedTo = ref(null);

const courts = ref([]); // canchas para UI
const clients = ref([]); // ✅ clientes para WhatsApp

const allEvents = ref([]); // cache de eventos (Schedule-X events)
const selectedCourtSlug = ref("all"); // "all" | "court1" | "court2"...

const calendarSelectedDate = ref(null);

const courtButtons = computed(() => [
  { label: "Todas", value: "all" },
  ...(courts.value ?? []).map((c) => ({
    label: c.name ?? c.slug,
    value: c.slug,
  })),
]);

defineShortcuts({
  o: () => (open.value = !open.value),
});

let eventsService;

const TZ = "America/Argentina/Buenos_Aires";
const { loadRange } = useBookings();
const { loadCourts } = useCourts();
const { loadClients } = useClients(); // ✅

const scrollContainerRef = ref(null);

function floorToHour(zdt) {
  return zdt.with({
    minute: 0,
    second: 0,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
  });
}

function applyCourtFilter() {
  if (!eventsService) return;

  const filtered =
    selectedCourtSlug.value === "all"
      ? allEvents.value
      : allEvents.value.filter((e) => e.calendarId === selectedCourtSlug.value);

  eventsService.set(filtered);
}

function buildCalendarsFromCourts(courts) {
  const palette = [
    { main: "#22c55e", container: "#dcfce7", onContainer: "#052e16" },
    { main: "#3b82f6", container: "#dbeafe", onContainer: "#172554" },
    { main: "#f97316", container: "#ffedd5", onContainer: "#7c2d12" },
    { main: "#a855f7", container: "#f3e8ff", onContainer: "#3b0764" },
  ];

  return Object.fromEntries(
    (courts ?? []).map((c, idx) => {
      const hasDbColors =
        c.color_main && c.color_container && c.color_on_container;

      const colors = hasDbColors
        ? {
            main: c.color_main,
            container: c.color_container,
            onContainer: c.color_on_container,
          }
        : palette[idx % palette.length];

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
      ];
    })
  );
}

async function getBookingsToday() {
  const nowZdt = Temporal.Now.zonedDateTimeISO(TZ);
  const todayPlain = nowZdt.toPlainDate();

  const startOfDay = todayPlain.toZonedDateTime({ timeZone: TZ });
  const endOfDay = startOfDay.add({ days: 1 });

  const fromISO = startOfDay.toInstant().toString();
  const toISO = endOfDay.toInstant().toString();

  const events = await loadRange({ fromISO, toISO });

  allEvents.value = events ?? [];
  applyCourtFilter();
}

async function scrollToNow({ retries = 30, delay = 50 } = {}) {
  await nextTick();

  const container = scrollContainerRef.value;
  if (!container) return;

  const findNowLine = () =>
    container.querySelector(".sx__current-time-indicator") ||
    container.querySelector(".sx__current-time") ||
    container.querySelector('[class*="current-time"]');

  const doScroll = (nowLine) => {
    const cRect = container.getBoundingClientRect();
    const nRect = nowLine.getBoundingClientRect();
    const currentScroll = container.scrollTop;
    const offsetInside = nRect.top - cRect.top + currentScroll;
    const target = offsetInside - container.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, target),
      behavior: "smooth",
    });
  };

  for (let i = 0; i < retries; i++) {
    const nowLine = findNowLine();
    if (nowLine) {
      requestAnimationFrame(() => doScroll(nowLine));
      return;
    }
    await new Promise((r) => setTimeout(r, delay));
  }
}

/** ✅ WhatsApp Web helpers **/
function normalizePhoneForWaMe(phoneRaw) {
  if (!phoneRaw) return null;
  const digits = String(phoneRaw).replace(/\D/g, "");
  if (!digits) return null;

  // ya viene con 54...
  if (digits.startsWith("54")) return digits;

  // asumimos AR celular
  return `549${digits}`;
}

function buildWhatsappMessage({
  clientName,
  dateStr,
  from,
  to,
  courtName,
  typeName,
  title,
}) {
  const headerName = clientName ? `Hola ${clientName}!` : "Hola!";
  const t = title ? `📝 ${title}\n` : "";

  return (
    `👋 ${headerName}\n` +
    `✅ Turno confirmado\n\n` +
    `📅 ${dateStr}\n` +
    `⏰ ${from} - ${to}\n` +
    (courtName ? `🎾 Cancha: ${courtName}\n` : "") +
    (typeName ? `🏷️ Tipo: ${typeName}\n` : "") +
    t +
    `\nCualquier cosa respondé este mensaje.`
  );
}

function openWhatsappWeb(phoneDigits, message) {
  const text = encodeURIComponent(message);
  console.log(phoneDigits);

  window.open(
    `https://wa.me/${phoneDigits}?text=${text}`,
    "_blank",
    "noopener,noreferrer"
  );
}

/** ✅ Handler que llama el modal */
async function handleCreated(payload) {
  // 1) refrescar el calendario
  await getBookingsToday();

  // 2) armar y abrir wapp
  const client = clients.value.find((c) => c.id === payload?.clientId) ?? null;
  const phoneDigits = normalizePhoneForWaMe(client?.phone);

  if (!phoneDigits) return;

  const courtName =
    courts.value.find((c) => c.id === payload?.courtId)?.name ?? "";
  const message = buildWhatsappMessage({
    clientName: client?.full_name ?? "",
    dateStr: payload?.date ?? "",
    from: payload?.from ?? "",
    to: payload?.to ?? "",
    courtName,
    typeName: "", // si querés mostrar el tipo, cargá types en el padre o mandá el name desde el modal
    title: payload?.title ?? "",
  });

  openWhatsappWeb(phoneDigits, message);
}

onMounted(async () => {
  const { Temporal } = await import("temporal-polyfill");
  globalThis.Temporal = Temporal;

  calendarSelectedDate.value = Temporal.Now.zonedDateTimeISO(TZ).toPlainDate();
  eventsService = createEventsServicePlugin();

  // cargar courts
  let loadedCourts = [];
  try {
    if (!loadCourts) throw new Error("No existe loadCourts() en tu proyecto");
    loadedCourts = await loadCourts();
  } catch (e) {
    console.error("Error cargando courts:", e);
    loadedCourts = [];
  }

  courts.value = loadedCourts ?? [];
  const calendarsFromDb = buildCalendarsFromCourts(courts.value);

  // ✅ cargar clients (para WhatsApp)
  try {
    clients.value = (await loadClients()) ?? [];
  } catch (e) {
    console.error("Error cargando clients:", e);
    clients.value = [];
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
        const start = floorToHour(dateTime);
        const end = start.add({ minutes: 60 });

        const date = `${start.year}-${String(start.month).padStart(
          2,
          "0"
        )}-${String(start.day).padStart(2, "0")}`;
        const from = `${String(start.hour).padStart(2, "0")}:00`;
        const to = `${String(end.hour).padStart(2, "0")}:${String(
          end.minute
        ).padStart(2, "0")}`;

        selectedDate.value = date;
        selectedFrom.value = from;
        selectedTo.value = to;

        open.value = true;
      },
      onEventClick(event) {
        console.log(event);
      },
    },

    selectedDate: calendarSelectedDate.value,
    views: [createViewDay(), createViewWeek(), createViewList()],
    plugins: [eventsService, eventModal, createCurrentTimePlugin()],

    calendars: calendarsFromDb,
    events: [],
  });

  // cargar bookings
  try {
    await getBookingsToday();
  } catch (e) {
    console.error("Error cargando bookings:", e);
  }

  ready.value = true;

  scrollToNow();
  watch(ready, (v) => v && scrollToNow());

  watch(selectedCourtSlug, () => {
    applyCourtFilter();
  });
});
</script>

<template>
  <div class="min-h-0 flex flex-col">
    <div class="sticky top-0 z-20 bg-background/90 backdrop-blur p-4">
      <div class="flex justify-between gap-2">
        <UModal v-model:open="open">
          <UButton label="Cargar turno" />
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

        <UButton
          label="Ir a hora actual"
          variant="outline"
          @click="scrollToNow()"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButtonGroup>
          <UButton
            v-for="b in courtButtons"
            :key="b.value"
            :label="b.label"
            :variant="selectedCourtSlug === b.value ? 'solid' : 'outline'"
            size="sm"
            @click="selectedCourtSlug = b.value"
          />
        </UButtonGroup>
      </div>
    </div>

    <div ref="scrollContainerRef" class="min-h-0 flex-1 overflow-y-auto p-4">
      <ScheduleXCalendar v-if="ready" :calendar-app="calendarApp" />
    </div>
  </div>
</template>
