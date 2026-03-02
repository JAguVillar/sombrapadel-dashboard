import { createBookingsRepo } from "@/lib/repositories/bookings.repo";
import { mapBookingToScheduleXEvent } from "@/lib/mappers/scheduleX.mapper";

export function useBookings() {
  const supabase = useSupabaseClient();
  const repo = createBookingsRepo(supabase);

  const loading = ref(false);
  const error = ref(null);

  async function loadRange({ fromISO, toISO }) {
    loading.value = true;
    error.value = null;

    try {
      const rows = await repo.listByRange({ fromISO, toISO });
      return (rows ?? []).map(mapBookingToScheduleXEvent).filter(Boolean);
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createBooking(payload) {
    loading.value = true;
    error.value = null;
    try {
      const row = await repo.create(payload);
      return mapBookingToScheduleXEvent(row);
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // ✅ NUEVO: crea la serie (batch) y devuelve {seriesId, rows}
  async function createFixedBookings(payloads) {
    loading.value = true;
    error.value = null;
    try {
      const rows = await repo.createMany(payloads);
      return rows ?? [];
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteBooking(id) {
    loading.value = true;
    error.value = null;
    try {
      return await repo.remove(id);
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return {
    createBooking,
    createFixedBookings,
    deleteBooking,
    loadRange,
    loading,
    error,
  };
}
