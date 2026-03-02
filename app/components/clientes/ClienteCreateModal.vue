<script setup>
import * as z from "zod";
const emit = defineEmits(["close", "created"]);
const { createClient } = useClients();

const toast = useToast();
const submitting = ref(false);

// El usuario escribe SOLO el número local (sin +54 9)
const localPhoneRegex = /^[\d\s()-]{6,15}$/;

const schema = z.object({
  first_name: z
    .string({ required_error: "Ingresá el nombre" })
    .min(2, "El nombre es muy corto")
    .max(60, "El nombre es muy largo")
    .transform((v) => v.trim()),

  last_name: z
    .string({ required_error: "Ingresá el apellido" })
    .min(2, "El apellido es muy corto")
    .max(60, "El apellido es muy largo")
    .transform((v) => v.trim()),

  phone: z
    .string({ required_error: "Ingresá el teléfono" })
    .min(6, "El teléfono es muy corto")
    .max(20, "El teléfono es muy largo")
    .regex(localPhoneRegex, "Ingresá solo números (sin +54)")
    .transform((v) => v.replace(/\D/g, "")) // solo dígitos
    .transform((digits) => `+549${digits}`), // ✅ prefijo fijo

  description: z
    .string()
    .optional()
    .transform((v) => (v == null ? "" : v.trim()))
    .refine((v) => v.length <= 280, "La descripción es muy larga"),
});

const state = reactive({
  first_name: "",
  last_name: "",
  phone: "", // solo número local
  description: "",
});

async function onSubmit() {
  if (submitting.value) return;
  submitting.value = true;

  try {
    const parsed = schema.parse(state);

    const payloadDB = {
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      phone: parsed.phone, // 👉 "+549XXXXXXXXXX"
      description: parsed.description || null,
    };

    const createdClient = await createClient(payloadDB);

    emit("created", createdClient);

    toast.add({
      title: "Cliente creado",
      description: "Se guardó correctamente",
      color: "success",
    });

    emit("close");
  } catch (e) {
    console.error(e);

    const zodMessage =
      e?.issues?.[0]?.message || e?.errors?.[0]?.message || null;

    const msg =
      zodMessage ||
      (e?.code === "CLIENT_PHONE_EXISTS"
        ? "Ya existe un cliente con ese teléfono."
        : "No se pudo crear el cliente.");

    toast.add({
      title: "Error",
      description: msg,
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Nuevo cliente</h3>
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          :disabled="submitting"
          @click="$emit('close')"
        />
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Nombre" name="first_name" required>
        <UInput v-model="state.first_name" :disabled="submitting" />
      </UFormField>

      <UFormField label="Apellido" name="last_name" required>
        <UInput v-model="state.last_name" :disabled="submitting" />
      </UFormField>

      <UFormField label="Teléfono" name="phone" required>
        <UInput
          v-model="state.phone"
          :disabled="submitting"
          placeholder="351 123 4567"
          :ui="{
            base: 'pl-14.5',
            leading: 'pointer-events-none',
          }"
        >
          <template #leading>
            <p class="text-muted">+54 9</p>
          </template>
        </UInput>
      </UFormField>

      <UFormField
        label="Descripción"
        name="description"
        hint="Opcional (máx 280)"
      >
        <UTextarea v-model="state.description" :disabled="submitting" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          color="neutral"
          :disabled="submitting"
          @click="$emit('close')"
        >
          Cancelar
        </UButton>
        <UButton type="submit" :loading="submitting"> Guardar </UButton>
      </div>
    </UForm>
  </UCard>
</template>
