<script setup>
import * as z from "zod";

definePageMeta({ layout: "main" });

const toast = useToast();
const supabase = useSupabaseClient();
const router = useRouter();

const mode = ref("login");
const loading = ref(false);

const fields = [
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Enter your password",
    required: true,
  },
  {
    name: "remember",
    label: "Remember me",
    type: "checkbox",
  },
];

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Must be at least 8 characters"),
  remember: z.boolean().optional(),
});

async function onSubmit({ data }) {
  loading.value = true;

  const { email, password, remember } = data;

  if (mode.value === "login") {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: remember ? undefined : { expiresIn: 60 * 60 * 24 }, // 1 día si no "remember"
    });

    loading.value = false;

    if (error) {
      // Mensajes típicos de Supabase
      const msg = error.message.toLowerCase();

      if (msg.includes("email not confirmed")) {
        toast.add({
          title: "Email no confirmado",
          description:
            "Revisá tu correo y confirmá la cuenta antes de ingresar.",
          color: "amber",
        });
        return;
      }

      toast.add({
        title: "Login failed",
        description: error.message,
        color: "red",
      });
      return;
    }

    toast.add({ title: "Logged in", description: "Welcome back!" });
    await router.push("/home"); // tu dashboard
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/confirm`,
    },
  });

  loading.value = false;

  if (error) {
    toast.add({
      title: "Sign up failed",
      description: error.message,
      color: "red",
    });
    return;
  }

  toast.add({
    title: "Cuenta creada",
    description:
      "Si tenés confirmación por email activada, revisá tu correo para confirmar la cuenta.",
  });

  mode.value = "login";
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        :title="mode === 'login' ? 'Login' : 'Create account'"
        :description="
          mode === 'login'
            ? 'Enter your credentials to access your account.'
            : 'Create an account with email and password.'
        "
        icon="i-lucide-user"
        :fields="fields"
        :loading="loading"
        @submit="onSubmit"
      />

      <div class="mt-4 flex items-center justify-between text-sm">
        <span class="text-gray-500 dark:text-gray-400">
          {{ mode === "login" ? "No tenés cuenta?" : "Ya tenés cuenta?" }}
        </span>

        <UButton
          variant="link"
          size="sm"
          :disabled="loading"
          @click="mode = mode === 'login' ? 'register' : 'login'"
        >
          {{ mode === "login" ? "Crear cuenta" : "Ir a login" }}
        </UButton>
      </div>
    </UPageCard>
  </div>
</template>
