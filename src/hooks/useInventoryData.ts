"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useInventoryStore } from "@/lib/inventory-state";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { DeviceCategory, DEVICE_CATEGORY_LABELS } from "@/types/device";

interface UseInventoryDataProps {
  daysToShow: number;
}

interface UseInventoryDataReturn {
  loading: boolean;
  error: string | null;
  initialized: boolean;
  loadReservations: (start: Date, end: Date) => Promise<void>;
  handleLoadMore: (newStartDate: Date, newEndDate: Date) => Promise<void>;
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
        console.log("🔄 API 호출 시작:", {
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
          selectedCategories,
        });

        setLoading(true);
        setError(null);

        // 카테고리가 선택되지 않았다면 빈 결과 반환
        if (selectedCategories.length === 0) {
          console.log(
            "⚠️ 선택된 카테고리 없음, devices/timeSlots 빈 배열로 세팅"
          );
          setDevices([]);
          setTimeSlots(createEmptyTimeSlots(start, end));
          setLoading(false);
          return;
        }

        // API 호출
        const startDateStr = format(start, "yyyy-MM-dd");
        const endDateStr = format(end, "yyyy-MM-dd");
        const categoriesStr = selectedCategories.join(",");

        const response = await fetch(
          `/api/inventory?startDate=${startDateStr}&endDate=${endDateStr}&categories=${categoriesStr}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `API 요청 실패: ${response.status}`
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "API 응답 오류");
        }

        console.log("✅ API 응답 성공:", {
          devicesCount: result.data.devices.length,
          timeSlotsCount: result.data.timeSlots.length,
        });

        setDevices(result.data.devices);
        setTimeSlots(result.data.timeSlots);
      } catch (err) {
        console.error("❌ API 호출 오류:", err);
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
        console.log("✅ API 호출 완료");
      }
    },
    [selectedCategories, createEmptyTimeSlots, setDevices, setTimeSlots]
  );

  // 초기화 로직
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    console.log("🔄 초기화 시작");
    const today = new Date();
    // 미래 예약이 많으므로 미래 범위를 더 넓게 설정 (과거 7일 ~ 미래 90일)
    const initialStartDate = startOfDay(subDays(today, 14));
    const initialEndDate = endOfDay(addDays(today, 14));

    console.log("📅 초기 날짜 설정 (미래 중심):", {
      initialStartDate: format(initialStartDate, "yyyy-MM-dd"),
      initialEndDate: format(initialEndDate, "yyyy-MM-dd"),
      today: format(today, "yyyy-MM-dd"),
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
    if (!initialized || !startDate || !endDate) {
      console.log("⚠️ 데이터 로딩 조건 미충족:", {
        initialized,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : null,
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
        selectedCategoriesLength: selectedCategories.length,
      });
      return;
    }

    console.log("🔄 데이터 로딩 시작:", {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      selectedCategories,
      selectedCategoriesLength: selectedCategories.length,
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
  };
};
