import { create } from "zustand";
import { Device, DeviceCategory, DEVICE_CATEGORY_LABELS } from "@/types/device";
import { Database } from "@/lib/supabase/database.types";
import { addDays, subDays, startOfDay } from "date-fns";
import { RentalReservation } from "@/types/rental";

export interface TimeSlot {
  date: string;
  reservations: RentalReservation[];
}

interface InventoryState {
  // 데이터
  devices: string[];
  timeSlots: TimeSlot[];
  loading: boolean;
  error: string | null;

  // 날짜 범위
  startDate: Date;
  endDate: Date;

  // 필터
  searchTerm: string;
  selectedCategories: DeviceCategory[];

  // 액션
  setDevices: (devices: string[]) => void;
  setTimeSlots: (timeSlots: TimeSlot[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (term: string) => void;
  setSelectedCategories: (categories: DeviceCategory[]) => void;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;

  // 날짜 범위 조정
  extendPastDays: (days: number) => Date;
  extendFutureDays: (days: number) => Date;

  // 필터링된 데이터 getter
  getFilteredDevices: () => string[];
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  // 초기 상태
  devices: [],
  timeSlots: [],
  loading: false,
  error: null,
  searchTerm: "",
  selectedCategories: Object.keys(DEVICE_CATEGORY_LABELS) as DeviceCategory[],
  startDate: startOfDay(new Date()),
  endDate: startOfDay(addDays(new Date(), 1)),

  // 액션
  setDevices: (devices: string[]) => set({ devices }),
  setTimeSlots: (timeSlots: TimeSlot[]) => set({ timeSlots }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setSearchTerm: (searchTerm: string) => set({ searchTerm }),
  setSelectedCategories: (selectedCategories: DeviceCategory[]) =>
    set({ selectedCategories }),
  setStartDate: (date: Date) => set({ startDate: date }),
  setEndDate: (date: Date) => set({ endDate: date }),

  // 날짜 범위 조정
  extendPastDays: (days: number) => {
    const { startDate } = get();
    const newStartDate = subDays(startDate, days);
    set({ startDate: newStartDate });
    return newStartDate;
  },

  extendFutureDays: (days: number) => {
    const { endDate } = get();
    const newEndDate = addDays(endDate, days);
    set({ endDate: newEndDate });
    return newEndDate;
  },

  // 필터링된 데이터 getter
  getFilteredDevices: () => {
    const { devices, searchTerm } = get();

    if (!searchTerm) {
      return devices;
    }

    const term = searchTerm.toLowerCase();
    return devices.filter((device) => device.toLowerCase().includes(term));
  },
}));
