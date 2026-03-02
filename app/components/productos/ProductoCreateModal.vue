<script setup>
import * as z from "zod";
const emit = defineEmits(["close", "created"]);
const { createProduct } = useProducts();

const toast = useToast();
const submitting = ref(false);

const schema = z.object({
  name: z
    .string({ required_error: "Ingresa el nombre" })
    .min(2, "El nombre es muy corto")
    .max(120, "El nombre es muy largo")
    .transform((v) => v.trim()),

  description: z
    .string()
    .optional()
    .transform((v) => (v == null ? "" : v.trim()))
    .refine((v) => v.length <= 280, "La descripcion es muy larga"),

  price: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
    z
      .number({
        required_error: "Ingresa el precio",
        invalid_type_error: "Precio invalido",
      })
      .nonnegative("El precio debe ser mayor o igual a 0")
  ),

  track_stock: z.boolean(),
  active: z.boolean(),
});

const state = reactive({
  name: "",
  description: "",
  price: "",
  track_stock: true,
  active: true,
});

async function onSubmit() {
  if (submitting.value) return;
  submitting.value = true;

  try {
    const parsed = schema.parse(state);

    const payloadDB = {
      name: parsed.name,
      description: parsed.description || null,
      price: parsed.price,
      track_stock: parsed.track_stock,
      active: parsed.active,
    };

    const createdProduct = await createProduct(payloadDB);

    emit("created", createdProduct);

    toast.add({
      title: "Producto creado",
      description: "Se guardo correctamente",
      color: "success",
    });

    emit("close");
  } catch (e) {
    console.error(e);

    const zodMessage =
      e?.issues?.[0]?.message || e?.errors?.[0]?.message || null;

    const msg = zodMessage || "No se pudo crear el producto.";

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
        <h3 class="font-semibold">Nuevo producto</h3>
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
      <UFormField label="Nombre" name="name" required>
        <UInput v-model="state.name" :disabled="submitting" />
      </UFormField>

      <UFormField label="Descripcion" name="description" hint="Opcional (max 280)">
        <UTextarea v-model="state.description" :disabled="submitting" />
      </UFormField>

      <UFormField label="Precio" name="price" required>
        <UInput
          v-model="state.price"
          type="number"
          step="0.01"
          min="0"
          :disabled="submitting"
        />
      </UFormField>

      <UFormField label="Controlar stock" name="track_stock">
        <USwitch v-model="state.track_stock" :disabled="submitting" />
      </UFormField>

      <UFormField label="Activo" name="active">
        <USwitch v-model="state.active" :disabled="submitting" />
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
