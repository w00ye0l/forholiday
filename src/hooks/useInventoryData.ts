"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useInventoryStore } from "@/lib/inventory-state";
import { TimeSlot } from "@/lib/inventory-state";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import {
  RentalReservation,
  ReservationStatus,
  PickupMethod,
  ReturnMethod,
  ReservationSite,
} from "@/types/rental";
import { Database } from "@/lib/supabase/database.types";
import {
  DeviceCategory,
  DeviceStatus,
  Device,
  DEVICE_CATEGORY_LABELS,
} from "@/types/device";
import { findOptimalDevice } from "@/lib/algorithms/auto-assign";

type DatabaseReservation =
  Database["public"]["Tables"]["rental_reservations"]["Row"];

const AVAILABLE_DEVICE_STATUSES: DeviceStatus[] = [
  "available",
  "reserved",
  "in_use",
  "rented",
  "pending_return",
];

interface UseInventoryDataProps {
  daysToShow: number;
}

interface UseInventoryDataReturn {
  loading: boolean;
  error: string | null;
  initialized: boolean;
  loadReservations: (start: Date, end: Date) => Promise<void>;
  handleLoadMore: (newStartDate: Date, newEndDate: Date) => Promise<void>;
  autoAssignDevices: (
    reservations: RentalReservation[],
    devices: Device[]
  ) => RentalReservation[];
}

export const useInventoryData = ({
  daysToShow,
}: UseInventoryDataProps): UseInventoryDataReturn => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const initializationRef = useRef(false);

  const {
    startDate,
    endDate,
    selectedCategories,
    setDevices,
    setTimeSlots,
    setStartDate,
    setEndDate,
    setSelectedCategories,
  } = useInventoryStore();

  const supabase = createClient();

  // 자동 할당 알고리즘 (메모이제이션 적용)
  const autoAssignDevices = useCallback(
    (
      reservations: RentalReservation[],
      devices: Device[]
    ): RentalReservation[] => {
      const devicesByCategory = new Map<DeviceCategory, string[]>();

      // 카테고리별로 기기 그룹화
      devices.forEach((device) => {
        const category = device.category as DeviceCategory;
        if (!devicesByCategory.has(category)) {
          devicesByCategory.set(category, []);
        }
        devicesByCategory.get(category)?.push(device.tag_name);
      });

      const assignedReservations = [...reservations];
      const deviceUsage = new Map<
        string,
        { pickup_date: string; return_date: string }[]
      >();

      // 이미 할당된 기기들의 사용 기간 추적
      reservations.forEach((reservation) => {
        if (reservation.device_tag_name) {
          if (!deviceUsage.has(reservation.device_tag_name)) {
            deviceUsage.set(reservation.device_tag_name, []);
          }
          deviceUsage.get(reservation.device_tag_name)?.push({
            pickup_date: reservation.pickup_date,
            return_date: reservation.return_date,
          });
        }
      });

      // 기기 태그가 없는 예약들을 최적화 알고리즘으로 할당
      assignedReservations.forEach((reservation) => {
        if (!reservation.device_tag_name) {
          const availableDevices =
            devicesByCategory.get(reservation.device_category) || [];

          // 최적화된 기기 선택 알고리즘 적용
          const optimalDevice = findOptimalDevice(
            reservation,
            availableDevices,
            deviceUsage
          );

          if (optimalDevice) {
            reservation.device_tag_name = optimalDevice;
            if (!deviceUsage.has(optimalDevice)) {
              deviceUsage.set(optimalDevice, []);
            }
            deviceUsage.get(optimalDevice)?.push({
              pickup_date: reservation.pickup_date,
              return_date: reservation.return_date,
            });
          }
        }
      });

      return assignedReservations;
    },
    []
  );

  const convertToRentalReservation = useCallback(
    (
      dbReservation: DatabaseReservation,
      deviceCategory: DeviceCategory
    ): RentalReservation => {
      return {
        id: dbReservation.id,
        reservation_id: dbReservation.reservation_id,
        user_id: dbReservation.user_id,
        device_category: deviceCategory,
        device_tag_name: dbReservation.device_tag_name,
        status: dbReservation.status as ReservationStatus,
        pickup_date: dbReservation.pickup_date,
        pickup_time: dbReservation.pickup_time,
        return_date: dbReservation.return_date,
        return_time: dbReservation.return_time,
        pickup_method: dbReservation.pickup_method as PickupMethod,
        return_method: dbReservation.return_method as ReturnMethod,
        data_transmission: dbReservation.data_transmission,
        sd_option: dbReservation.sd_option as
          | "대여"
          | "구매"
          | "구매+대여"
          | undefined,
        reservation_site: dbReservation.reservation_site as ReservationSite,
        renter_name: dbReservation.renter_name,
        renter_phone: dbReservation.renter_phone,
        renter_address: dbReservation.renter_address,
        renter_email: dbReservation.renter_email || undefined,
        order_number: dbReservation.order_number || undefined,
        contact_image_url: dbReservation.contact_image_url || undefined,
        contact_input_type: dbReservation.contact_input_type as
          | "text"
          | "image",
        description: dbReservation.description || undefined,
        created_at: dbReservation.created_at,
        updated_at: dbReservation.updated_at,
        cancelled_at: dbReservation.cancelled_at || undefined,
        cancel_reason: dbReservation.cancel_reason || undefined,
      };
    },
    []
  );

  const createEmptyTimeSlots = useCallback((start: Date, end: Date) => {
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Array.from({ length: days + 1 }, (_, i) => ({
      date: format(addDays(start, i), "yyyy-MM-dd"),
      reservations: [],
    }));
  }, []);

  const loadReservations = useCallback(
    async (start: Date, end: Date) => {
      try {
        console.log("🔄 loadReservations 시작:", {
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
          selectedCategories,
        });

        setLoading(true);
        setError(null);

        // 카테고리가 선택되지 않았다면 모든 카테고리 선택 (기존)
        if (selectedCategories.length === 0) {
          console.log(
            "⚠️ 선택된 카테고리 없음, devices/timeSlots 빈 배열로 세팅"
          );
          setDevices([]);
          setTimeSlots(createEmptyTimeSlots(start, end));
          setLoading(false);
          return;
        }

        // 1. 모든 기기 정보를 가져옵니다
        console.log("📱 모든 기기 데이터 요청");
        const { data: allDevicesData, error: devicesError } = await supabase
          .from("devices")
          .select("*");

        console.log("📱 기기 데이터 응답:", {
          totalDevices: allDevicesData?.length,
          devicesError,
          sampleDevice: allDevicesData?.[0],
        });

        if (devicesError) {
          console.error("❌ 기기 데이터 조회 오류:", devicesError);
          setError(devicesError.message);
          return;
        }

        if (!allDevicesData || allDevicesData.length === 0) {
          console.log("⚠️ 기기 데이터 없음");
          setDevices([]);
          setTimeSlots(createEmptyTimeSlots(start, end));
          setLoading(false);
          return;
        }

        // 2. 선택된 카테고리의 기기만 필터링
        const filteredDevices = allDevicesData.filter((device) =>
          selectedCategories.includes(device.category as DeviceCategory)
        );

        console.log("📱 필터링된 기기:", {
          totalDevices: allDevicesData.length,
          filteredCount: filteredDevices.length,
          selectedCategories,
          availableCategories: Array.from(
            new Set(allDevicesData.map((d) => d.category))
          ),
          sampleFilteredDevice: filteredDevices[0],
        });

        if (filteredDevices.length === 0) {
          console.log("⚠️ 선택된 카테고리의 기기 없음");
          setDevices([]);
          setTimeSlots(createEmptyTimeSlots(start, end));
          setLoading(false);
          return;
        }

        // 3. 기기 목록과 카테고리 맵 생성
        const devicesList = filteredDevices.map((device) => device.tag_name);
        const deviceTagMap = new Map(
          filteredDevices.map((device) => [
            device.tag_name,
            device.category as DeviceCategory,
          ])
        );

        console.log("📱 기기 목록 업데이트:", {
          devicesList,
          deviceTagMapSize: deviceTagMap.size,
          deviceTagMapEntries: Array.from(deviceTagMap.entries()).slice(0, 5),
        });

        setDevices(devicesList);

        // 4. 모든 예약을 가져옵니다
        console.log("📅 예약 데이터 요청");
        const { data: allReservations, error: reservationsError } =
          await supabase.from("rental_reservations").select("*");

        console.log("📅 예약 데이터 응답:", {
          totalReservations: allReservations?.length,
          reservationsError,
          sampleReservation: allReservations?.[0],
          reservationStatuses: allReservations
            ? Array.from(new Set(allReservations.map((r) => r.status)))
            : [],
        });

        if (reservationsError) {
          console.error("❌ 예약 데이터 조회 오류:", reservationsError);
          setError(reservationsError.message);
          return;
        }

        // 5. 예약이 있는 경우에만 처리
        if (!allReservations || allReservations.length === 0) {
          console.log("⚠️ 예약 데이터 없음 - 빈 타임슬롯 생성");
          setTimeSlots(createEmptyTimeSlots(start, end));
          setLoading(false);
          return;
        }

        // 6. 기기 목록에 해당하는 예약만 선별 (기기 태그 없는 예약도 포함)
        const filteredReservations = allReservations.filter(
          (reservation) =>
            !reservation.device_tag_name ||
            devicesList.includes(reservation.device_tag_name)
        );

        console.log("📅 필터링된 예약:", {
          totalReservations: allReservations.length,
          filteredReservations: filteredReservations.length,
          devicesList: devicesList.slice(0, 5),
          reservationDevices: Array.from(
            new Set(
              allReservations.map((r) => r.device_tag_name).filter(Boolean)
            )
          ).slice(0, 10),
        });

        // 7. 예약 정보를 변환
        const rentalReservations = filteredReservations
          .map((reservation) => {
            // 기기 태그가 없는 경우에도 카테고리 정보는 반드시 있음
            const deviceCategory = reservation.device_tag_name
              ? deviceTagMap.get(reservation.device_tag_name)
              : reservation.device_category;
            if (!deviceCategory) {
              console.warn("⚠️ 기기 카테고리 찾을 수 없음:", {
                device_tag_name: reservation.device_tag_name,
                available_devices: Array.from(deviceTagMap.keys()).slice(0, 5),
              });
              return null;
            }
            return convertToRentalReservation(reservation, deviceCategory);
          })
          .filter((r): r is RentalReservation => r !== null);

        // 8. 기기 태그가 없는 예약을 자동 할당 (모든 예약이 반드시 거침)
        const autoAssignedReservations = autoAssignDevices(
          rentalReservations,
          filteredDevices
        );

        console.log("📅 자동 할당 완료:", {
          originalReservations: rentalReservations.length,
          autoAssignedReservations: autoAssignedReservations.length,
          statusDistribution: autoAssignedReservations.reduce(
            (acc: Record<string, number>, r: RentalReservation) => {
              acc[r.status] = (acc[r.status] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        });

        // 9. 날짜별 타임슬롯을 생성하고 예약을 배치
        const newTimeSlots = createEmptyTimeSlots(start, end).map((slot) => {
          console.log("🗓️ 슬롯 처리 중:", slot.date);

          const slotReservations = autoAssignedReservations.filter(
            (reservation: RentalReservation) => {
              const slotDate = slot.date;
              const pickupDate = reservation.pickup_date;
              const returnDate = reservation.return_date;

              // 모든 예약 상태를 포함하여 슬롯 날짜가 대여일과 반납일 사이에 있는지 확인
              // 수령 완료(picked_up)와 반납 완료(returned) 상태도 포함
              const isInRange =
                pickupDate <= slotDate && returnDate >= slotDate;

              if (isInRange) {
                console.log("📅 예약이 슬롯에 포함됨:", {
                  slotDate,
                  pickupDate,
                  returnDate,
                  status: reservation.status,
                  device: reservation.device_tag_name,
                  renter: reservation.renter_name,
                });
              }

              return isInRange;
            }
          );

          return {
            ...slot,
            reservations: slotReservations,
          };
        });

        console.log("📅 타임슬롯 생성 완료:", {
          slotCount: newTimeSlots.length,
          slotsWithReservations: newTimeSlots.filter(
            (slot) => slot.reservations.length > 0
          ).length,
          totalReservationsInSlots: newTimeSlots.reduce(
            (sum, slot) => sum + slot.reservations.length,
            0
          ),
          firstSlotWithReservations: newTimeSlots.find(
            (slot) => slot.reservations.length > 0
          ),
        });

        setTimeSlots(newTimeSlots);
      } catch (err) {
        console.error("❌ loadReservations 오류:", err);
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
        console.log("✅ loadReservations 완료");
      }
    },
    [
      selectedCategories,
      createEmptyTimeSlots,
      convertToRentalReservation,
      setDevices,
      setTimeSlots,
      setSelectedCategories,
      autoAssignDevices,
      supabase,
    ]
  );

  // 초기화 로직
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    console.log("🔄 초기화 시작");
    const today = new Date();
    const initialStartDate = startOfDay(subDays(today, daysToShow));
    const initialEndDate = endOfDay(addDays(today, daysToShow));

    console.log("📅 초기 날짜 설정:", {
      initialStartDate: format(initialStartDate, "yyyy-MM-dd"),
      initialEndDate: format(initialEndDate, "yyyy-MM-dd"),
    });

    setStartDate(initialStartDate);
    setEndDate(initialEndDate);

    if (selectedCategories.length === 0) {
      const allCategories = Object.keys(
        DEVICE_CATEGORY_LABELS
      ) as DeviceCategory[];
      console.log("📱 초기 카테고리 설정:", allCategories);
      setSelectedCategories(allCategories);
    }

    setInitialized(true);
  }, [
    setStartDate,
    setEndDate,
    setSelectedCategories,
    selectedCategories.length,
    daysToShow,
  ]);

  // 데이터 로딩 로직
  useEffect(() => {
    if (!initialized || !startDate || !endDate) return;

    console.log("🔄 데이터 로딩 시작:", {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      selectedCategories,
    });

    loadReservations(startDate, endDate);
  }, [initialized, startDate, endDate, selectedCategories, loadReservations]);

  // TimelineView에서 사용할 onLoadMore 함수
  const handleLoadMore = useCallback(
    async (newStartDate: Date, newEndDate: Date) => {
      console.log("📅 날짜 범위 확장:", {
        currentStart: format(startDate, "yyyy-MM-dd"),
        currentEnd: format(endDate, "yyyy-MM-dd"),
        newStart: format(newStartDate, "yyyy-MM-dd"),
        newEnd: format(newEndDate, "yyyy-MM-dd"),
      });

      // 날짜 범위 업데이트
      setStartDate(newStartDate);
      setEndDate(newEndDate);

      // 데이터 로드는 useEffect에서 자동으로 처리됨
    },
    [startDate, endDate, setStartDate, setEndDate]
  );

  return {
    loading,
    error,
    initialized,
    loadReservations,
    handleLoadMore,
    autoAssignDevices,
  };
};
