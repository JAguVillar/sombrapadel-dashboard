<script setup>
import * as z from "zod";
import {
  today,
  getLocalTimeZone,
  CalendarDate,
  parseTime,
} from "@internationalized/date";
const TZ = "America/Argentina/Buenos_Aires";

const { createFixedBookings } = useBookings();
const { loadBookingTypes } = useBookingsTypes();
const { loadCourts } = useCourts();
const { loadClients } = useClients();

const props = defineProps({
  initialDate: String, // "2026-01-08"
  initialFrom: String, // "11:00"
  initialTo: String, // "12:00"
});

const emit = defineEmits(["close", "created"]);

const toast = useToast();
const submitting = ref(false);

const clientSearch = ref("");
const types = ref([]);
const courts = ref([]);
const clients = ref([]);

const inputDate = useTemplateRef("inputDate");
const minDate = computed(() => today(getLocalTimeZone()));

const typeItems = computed(() =>
  (types.value ?? []).map((t) => ({ label: t.name, value: t.id }))
);

const courtItems = computed(() =>
  (courts.value ?? []).map((c) => ({ label: c.name, value: c.id }))
);

const clientItems = computed(() =>
  (clients.value ?? []).map((c) => ({ label: c.full_name, value: c.id }))
);

// 1=Lun ... 7=Dom (Temporal)
const weekdayItems = [
  { label: "Lunes", value: 1 },
  { label: "Martes", value: 2 },
  { label: "Miércoles", value: 3 },
  { label: "Jueves", value: 4 },
  { label: "Viernes", value: 5 },
  { label: "Sábado", value: 6 },
  { label: "Domingo", value: 7 },
];

function parseISOToCalendarDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new CalendarDate(y, m, d);
}

function parseHHMMToTime(value) {
  if (!value) return undefined;
  try {
    return parseTime(value);
  } catch {
    return undefined;
  }
}

function timeToHHMM(time) {
  if (!time) return undefined;
  return time.toString().slice(0, 5);
}

const date = shallowRef(
  parseISOToCalendarDate(props.initialDate) ?? today(getLocalTimeZone())
);

function normalizeSelectValue(value) {
  if (!value) return null;
  if (typeof value === "object") return value.value ?? null;
  return value;
}

// estado form
const state = reactive({
  name: undefined,
  clientId: null,
  bookingTypeId: null,
  courtId: null,
  from: parseHHMMToTime(props.initialFrom),
  to: parseHHMMToTime(props.initialTo),

  // ✅ recurrencia
  weekday: null, // 1..7
  weeks: 8, // default
});

// al abrir desde calendario, setear weekday por la fecha
watch(
  () => [props.initialDate, props.initialFrom, props.initialTo],
  ([d, f, t]) => {
    const cd = parseISOToCalendarDate(d);
    if (cd) date.value = cd;
    state.from = parseHHMMToTime(f);
    state.to = parseHHMMToTime(t);
  }
);

// set defaults al montar
onMounted(async () => {
  courts.value = (await loadCourts?.()) ?? [];
  types.value = (await loadBookingTypes?.()) ?? [];
  clients.value = (await loadClients?.()) ?? [];

  const normal =
    types.value.find((t) => t.slug === "fijo") ||
    types.value.find((t) => t.slug === "normal");
  state.bookingTypeId = normal?.id ?? types.value[0]?.id ?? null;

  if (!state.courtId) state.courtId = courts.value?.[0]?.id ?? null;

  // weekday default desde la fecha inicial
  try {
    const { Temporal } = await import("temporal-polyfill");
    globalThis.Temporal = Temporal;

    const pd = globalThis.Temporal.PlainDate.from(date.value.toString());
    state.weekday = pd.dayOfWeek; // 1..7
  } catch {}
});

// schema zod (simple pero útil)
const schema = z.object({
  name: z.string().optional(),
  clientId: z.any().optional(),
  bookingTypeId: z.any().optional(),
  courtId: z.any().optional(),
  from: z.any().optional(),
  to: z.any().optional(),
  weekday: z.any().optional(),
  weeks: z.any().optional(),
});

function nextWeekday(fromPlainDate, weekday) {
  const diff = (weekday - fromPlainDate.dayOfWeek + 7) % 7;
  return fromPlainDate.add({ days: diff });
}

function buildSeriesPayloads({
  seriesStartDateISO,
  weekday,
  weeks,
  fromHHMM,
  toHHMM,
  clientId,
  courtId,
  bookingTypeId,
  title,
}) {
  const Temporal = globalThis.Temporal;
  const base = Temporal.PlainDate.from(seriesStartDateISO);
  const first = nextWeekday(base, weekday);

  const seriesId = crypto.randomUUID();
  const payloads = [];

  for (let i = 0; i < weeks; i++) {
    const d = first.add({ days: i * 7 });

    const startZdt = Temporal.ZonedDateTime.from(
      `${d.toString()}T${fromHHMM}:00-03:00[${TZ}]`
    );
    const endZdt = Temporal.ZonedDateTime.from(
      `${d.toString()}T${toHHMM}:00-03:00[${TZ}]`
    );

    payloads.push({
      series_id: seriesId,
      client_id: clientId,
      court_id: courtId,
      booking_type_id: bookingTypeId,
      title: title ?? null,
      start_at: startZdt.toInstant().toString(),
      end_at: endZdt.toInstant().toString(),
    });
  }

  return { seriesId, payloads };
}

async function onSubmit() {
  if (submitting.value) return;
  submitting.value = true;

  try {
    const clientId = normalizeSelectValue(state.clientId);
    const bookingTypeId = normalizeSelectValue(state.bookingTypeId);
    const courtId = normalizeSelectValue(state.courtId);

    const from = timeToHHMM(state.from);
    const to = timeToHHMM(state.to);

    const weekday = Number(state.weekday);
    const weeks = Number(state.weeks);

    if (!clientId) {
      toast.add({
        title: "Falta cliente",
        description: "Seleccioná un cliente",
        color: "error",
      });
      return;
    }
    if (!bookingTypeId) {
      toast.add({
        title: "Falta tipo",
        description: "Seleccioná un tipo de turno",
        color: "error",
      });
      return;
    }
    if (!courtId) {
      toast.add({
        title: "Falta cancha",
        description: "Seleccioná una cancha",
        color: "error",
      });
      return;
    }
    if (!from || !to) {
      toast.add({
        title: "Falta horario",
        description: "Completá desde y hasta",
        color: "error",
      });
      return;
    }
    if (!weekday || weekday < 1 || weekday > 7) {
      toast.add({
        title: "Falta día",
        description: "Seleccioná un día de la semana",
        color: "error",
      });
      return;
    }
    if (!weeks || weeks < 1 || weeks > 104) {
      toast.add({
        title: "Semanas inválidas",
        description: "Elegí entre 1 y 104 semanas",
        color: "error",
      });
      return;
    }

    // Asegurar Temporal
    if (!globalThis.Temporal) {
      const { Temporal } = await import("temporal-polyfill");
      globalThis.Temporal = Temporal;
    }

    const seriesStartDateISO = date.value.toString(); // YYYY-MM-DD

    const { seriesId, payloads } = buildSeriesPayloads({
      seriesStartDateISO,
      weekday,
      weeks,
      fromHHMM: from,
      toHHMM: to,
      clientId,
      courtId,
      bookingTypeId,
      title: state.name ?? null,
    });

    // ✅ batch insert
    await createFixedBookings(payloads);

    emit("created", {
      seriesId,
      count: payloads.length,
      clientId,
      courtId,
      bookingTypeId,
      weekday,
      weeks,
      from,
      to,
      title: state.name ?? null,
      startDate: seriesStartDateISO,
    });

    toast.add({
      title: "Turno fijo creado",
      description: `Se generaron ${payloads.length} turnos (${weeks} semanas).`,
      color: "success",
    });

    emit("close");
  } catch (e) {
    console.error(e);

    const msg =
      e?.message?.includes("turnos_no_overlap") || e?.code === "23P01"
        ? "Alguno de esos horarios ya está ocupado en esa cancha."
        : "No se pudo crear el turno fijo.";

    toast.add({ title: "Error", description: msg, color: "error" });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Crear turno fijo</h3>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Nombre / nota" name="name">
        <UInput v-model="state.name" placeholder="Ej: Turno fijo" />
      </UFormField>

      <UFormField label="Cliente" name="clientId">
        <USelectMenu
          v-model="state.clientId"
          :items="clientItems"
          value-attribute="value"
          option-attribute="label"
          searchable
          :search-attributes="['label']"
          placeholder="Seleccioná un cliente"
          class="w-full"
        >
          <template #search>
            <UInput
              v-model="clientSearch"
              placeholder="Buscar cliente..."
              class="w-full"
            />
          </template>
        </USelectMenu>
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField label="Tipo de turno" name="bookingTypeId">
          <USelect
            v-model="state.bookingTypeId"
            :items="typeItems"
            placeholder="Tipo"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Cancha" name="courtId">
          <USelect
            v-model="state.courtId"
            :items="courtItems"
            placeholder="Cancha"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField label="Día de la semana" name="weekday">
          <USelect
            v-model="state.weekday"
            :items="weekdayItems"
            placeholder="Elegí día"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Repetir (semanas)" name="weeks">
          <UInput v-model="state.weeks" type="number" min="1" max="104" />
          <template #help>
            <span class="text-xs text-gray-500">
              Ej: 8 semanas = 2 meses aprox.
            </span>
          </template>
        </UFormField>
      </div>

      <UFormField label="Fecha de inicio" name="date">
        <UInputDate
          ref="inputDate"
          v-model="date"
          locale="es-AR"
          :min-value="minDate"
        >
          <template #trailing>
            <UPopover :reference="inputDate?.inputsRef[3]?.$el">
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-calendar"
                aria-label="Select a date"
                class="px-0"
              />
              <template #content>
                <UCalendar
                  v-model="date"
                  class="p-2"
                  locale="es-AR"
                  :min-value="minDate"
                />
              </template>
            </UPopover>
          </template>
        </UInputDate>
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField label="Desde" name="from">
          <UInputTime color="neutral" highlight v-model="state.from" />
        </UFormField>

        <UFormField label="Hasta" name="to">
          <UInputTime color="neutral" highlight v-model="state.to" />
        </UFormField>
      </div>

      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          color="neutral"
          type="button"
          :disabled="submitting"
          @click="$emit('close')"
        >
          Cancelar
        </UButton>

        <UButton type="submit" :loading="submitting"> Crear fijo </UButton>
      </div>
    </UForm>
  </UCard>
</template>
