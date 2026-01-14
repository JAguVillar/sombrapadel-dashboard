import { createBookingsTypesRepo } from "@/lib/repositories/bookingTypes.repo";

export function useBookingsTypes() {
  const supabase = useSupabaseClient();
  const repo = createBookingsTypesRepo(supabase);

  const loading = ref(false);
  const error = ref(null);

  async function loadBookingTypes() {
    loading.value = true;
    error.value = null;
    try {
      const rows = await repo.list();
      return rows;
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createBookingType(payload) {
    loading.value = true;
    error.value = null;
    try {
      const row = await repo.create(payload);
      return row;
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { loadBookingTypes, createBookingType, loading, error };
}
