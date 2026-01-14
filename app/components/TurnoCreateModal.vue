<script setup>
import * as z from "zod";
import {
  today,
  getLocalTimeZone,
  CalendarDate,
  parseTime,
} from "@internationalized/date";
import { useToast } from "#imports";

const { createBooking } = useBookings();
const { loadBookingTypes } = useBookingsTypes();
const { loadCourts } = useCourts();
const { loadClients } = useClients();

const props = defineProps({
  initialDate: String, // "2026-01-08"
  initialFrom: String, // "11:00"
  initialTo: String, // "12:00"
});

const emit = defineEmits(["close", "created"]);

const clientSearch = ref("");
const types = ref([]);
const courts = ref([]);
const clients = ref([]);

const inputDate = useTemplateRef("inputDate");
const minDate = computed(() => today(getLocalTimeZone()));

const typeItems = computed(() =>
  types.value.map((t) => ({
    label: t.name,
    value: t.id,
  }))
);

const courtItems = computed(() =>
  courts.value.map((c) => ({
    label: c.name,
    value: c.id,
  }))
);

const clientItems = computed(() =>
  clients.value.map((c) => ({
    label: c.full_name,
    value: c.id,
  }))
);

const submitting = ref(false);

onMounted(async () => {
  const typesCourts = await loadCourts?.();
  courts.value = typesCourts ?? [];

  const typesRows = await loadBookingTypes?.();
  types.value = typesRows ?? [];

  const clientsRows = await loadClients?.();
  clients.value = clientsRows ?? [];

  const normal = types.value.find((t) => t.slug === "normal");
  state.bookingTypeId = normal?.id ?? types.value[0]?.id ?? null;

  // opcional: si querés setear una cancha por default
  if (!state.courtId) state.courtId = courts.value?.[0]?.id ?? null;
});

function parseISOToCalendarDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new CalendarDate(y, m, d);
}

// ✅ string "HH:mm" -> TimeValue real (lo que espera UInputTime)
function parseHHMMToTime(value) {
  if (!value) return undefined;
  try {
    return parseTime(value);
  } catch {
    return undefined;
  }
}

// ✅ TimeValue -> "HH:mm"
function timeToHHMM(time) {
  if (!time) return undefined;
  return time.toString().slice(0, 5);
}

const date = shallowRef(
  parseISOToCalendarDate(props.initialDate) ?? today(getLocalTimeZone())
);

const schema = z.object({
  name: z.string().optional(),
  from: z.any().optional(),
  to: z.any().optional(),
});

const state = reactive({
  name: undefined,
  clientId: null,
  bookingTypeId: null,
  courtId: null,
  from: parseHHMMToTime(props.initialFrom),
  to: parseHHMMToTime(props.initialTo),
});

// 🔁 Cuando abrís el modal desde el calendario
watch(
  () => [props.initialDate, props.initialFrom, props.initialTo],
  ([d, f, t]) => {
    const cd = parseISOToCalendarDate(d);
    if (cd) date.value = cd;

    state.from = parseHHMMToTime(f);
    state.to = parseHHMMToTime(t);
  }
);

const toast = useToast();

async function onSubmit() {
  if (submitting.value) return;
  submitting.value = true;

  try {
    const payloadUI = {
      title: state.name ?? null,
      date: date.value.toString(), // "YYYY-MM-DD"
      from: timeToHHMM(state.from), // "HH:mm"
      to: timeToHHMM(state.to), // "HH:mm"
    };

    if (!payloadUI.from || !payloadUI.to) {
      toast.add({
        title: "Falta horario",
        description: "Completá desde y hasta",
        color: "error",
      });
      return;
    }

    if (!state.courtId) {
      toast.add({
        title: "Falta cancha",
        description: "Seleccioná una cancha",
        color: "error",
      });
      return;
    }

    if (!state.bookingTypeId) {
      toast.add({
        title: "Falta tipo",
        description: "Seleccioná un tipo de turno",
        color: "error",
      });
      return;
    }

    if (!state.clientId) {
      toast.add({
        title: "Falta cliente",
        description: "Seleccioná un cliente",
        color: "error",
      });
      return;
    }

    const { start_at, end_at } = buildInstants(payloadUI);

    // ✅ payload DB real (arreglado)
    const payloadDB = {
      client_id: state.clientId, // ✅ antes faltaba
      booking_type_id: state.bookingTypeId,
      court_id: state.courtId, // ✅ sin duplicar
      title: payloadUI.title,
      start_at,
      end_at,
    };

    const createdEvent = await createBooking(payloadDB);

    // ✅ mandamos payload rico para que el padre abra whatsapp + refresque eventos
    emit("created", {
      booking: createdEvent,
      clientId: state.clientId,
      courtId: state.courtId,
      bookingTypeId: state.bookingTypeId,
      date: payloadUI.date,
      from: payloadUI.from,
      to: payloadUI.to,
      title: payloadUI.title,
    });

    toast.add({
      title: "Turno creado",
      description: "Se guardó correctamente",
      color: "success",
    });

    emit("close");
  } catch (e) {
    console.error(e);

    const msg =
      e?.message?.includes("turnos_no_overlap") || e?.code === "23P01"
        ? "Ese horario ya está ocupado en esa cancha."
        : "No se pudo crear el turno.";

    toast.add({ title: "Error", description: msg, color: "error" });
  } finally {
    submitting.value = false;
  }
}

const TZ = "America/Argentina/Buenos_Aires";

function buildInstants({ date, from, to }) {
  const startZdt = globalThis.Temporal.ZonedDateTime.from(
    `${date}T${from}:00-03:00[${TZ}]`
  );

  const endZdt = globalThis.Temporal.ZonedDateTime.from(
    `${date}T${to}:00-03:00[${TZ}]`
  );

  return {
    start_at: startZdt.toInstant().toString(),
    end_at: endZdt.toInstant().toString(),
  };
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Modal simple</h3>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Nombre del turno" name="name">
        <UInput v-model="state.name" />
      </UFormField>

      <!-- <UFormField label="Cliente" name="clienteId">
        <USelect
          v-model="state.clientId"
          :items="clientItems"
          placeholder="Seleccioná un cliente"
          class="w-full"
        />
      </UFormField> -->

      <UFormField label="Cliente" name="clienteId">
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

      <UFormField label="Tipo de turno" name="bookingTypeId">
        <USelect
          v-model="state.bookingTypeId"
          :items="typeItems"
          placeholder="Seleccioná un tipo"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Cancha" name="court">
        <USelect
          v-model="state.courtId"
          :items="courtItems"
          placeholder="Seleccioná una cancha"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Fecha" name="date">
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

      <UFormField label="Desde" name="from">
        <UInputTime color="neutral" highlight v-model="state.from" />
      </UFormField>

      <UFormField label="Hasta" name="to">
        <UInputTime color="neutral" highlight v-model="state.to" />
      </UFormField>

      <UButton type="submit">Submit</UButton>
    </UForm>
  </UCard>
</template>
