"use client";

import React, { useRef, useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { TimeSlot } from "@/lib/inventory-state";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  RentalReservation,
  STATUS_MAP,
  PICKUP_METHOD_LABELS,
  RETURN_METHOD_LABELS,
} from "@/types/rental";

type TimelineViewProps = {
  devices: string[];
  timeSlots: TimeSlot[];
  startDate: Date;
  endDate: Date;
  loading: boolean;
  onLoadMore: (start: Date, end: Date) => Promise<void>;
  daysToShow: number;
};

type ReservationBlock = {
  reservation: RentalReservation;
  startIndex: number;
  endIndex: number;
  duration: number;
};

export const TimelineView = function TimelineView({
  devices,
  timeSlots,
  startDate,
  endDate,
  loading,
  onLoadMore,
  daysToShow,
}: TimelineViewProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [loadingPrevious, setLoadingPrevious] = React.useState(false);
  const [loadingNext, setLoadingNext] = React.useState(false);

  // 예약 블록 계산 (메모이제이션)
  const reservationBlocks = useMemo(() => {
    const blocks = new Map<string, ReservationBlock[]>();

    devices.forEach((deviceTag) => {
      const deviceBlocks: ReservationBlock[] = [];
      const processedReservations = new Set<string>();

      timeSlots.forEach((slot, slotIndex) => {
        const reservation = slot.reservations.find(
          (r) => r.device_tag_name === deviceTag
        );

        if (
          reservation &&
          !processedReservations.has(reservation.reservation_id) &&
          reservation.status !== "not_picked_up" // 미수령 상태 제외
        ) {
          processedReservations.add(reservation.reservation_id);

          // 예약이 차지하는 날짜 범위 계산
          const startIndex = timeSlots.findIndex(
            (s) => s.date === reservation.pickup_date
          );
          const endIndex = timeSlots.findIndex(
            (s) => s.date === reservation.return_date
          );

          if (startIndex !== -1 && endIndex !== -1) {
            const duration = endIndex - startIndex + 1;

            deviceBlocks.push({
              reservation,
              startIndex,
              endIndex,
              duration,
            });
          }
        }
      });

      blocks.set(deviceTag, deviceBlocks);
    });

    return blocks;
  }, [devices, timeSlots]);

  // 디버깅 로그 추가
  console.log("🖥️ TimelineView 렌더링:", {
    devices,
    timeSlots,
    deviceCount: devices.length,
    slotCount: timeSlots.length,
    reservationBlocks: Array.from(reservationBlocks.entries()).map(
      ([device, blocks]) => ({
        device,
        blockCount: blocks.length,
      })
    ),
  });

  const handleLoadPrevious = async () => {
    if (loadingPrevious || loading) return;
    setLoadingPrevious(true);
    try {
      const newStartDate = new Date(startDate);
      newStartDate.setDate(newStartDate.getDate() - daysToShow);
      await onLoadMore(newStartDate, endDate);
    } finally {
      setLoadingPrevious(false);
    }
  };

  const handleLoadNext = async () => {
    if (loadingNext || loading) return;
    setLoadingNext(true);
    try {
      const newEndDate = new Date(endDate);
      newEndDate.setDate(newEndDate.getDate() + daysToShow);
      await onLoadMore(startDate, newEndDate);
    } finally {
      setLoadingNext(false);
    }
  };

  // 특정 슬롯 인덱스에서 시작하는 예약 블록 찾기
  const findReservationBlock = (
    deviceTag: string,
    slotIndex: number
  ): ReservationBlock | null => {
    const deviceBlocks = reservationBlocks.get(deviceTag) || [];
    return deviceBlocks.find((block) => block.startIndex === slotIndex) || null;
  };

  // 특정 슬롯이 예약 블록의 중간 부분인지 확인
  const isBlockMiddle = (deviceTag: string, slotIndex: number): boolean => {
    const deviceBlocks = reservationBlocks.get(deviceTag) || [];
    return deviceBlocks.some(
      (block) => slotIndex > block.startIndex && slotIndex <= block.endIndex
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    console.log("⚠️ TimelineView: 타임슬롯 없음");
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-600">예약 정보가 없습니다.</div>
      </div>
    );
  }

  if (devices.length === 0) {
    console.log("⚠️ TimelineView: 기기 없음");
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-600">
          선택한 카테고리의 기기가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 w-full h-full overflow-x-auto">
      {/* 고정 헤더 */}
      <div className="sticky top-0 z-30 flex bg-gray-50">
        {/* 날짜 레이블 헤더 - 완전 고정 */}
        <div className="w-24 shrink-0 border-r border-gray-200 bg-gray-50">
          <div className="h-6 border-b border-gray-200 flex items-center justify-center font-medium text-xs">
            날짜
          </div>
        </div>

        {/* 기기 헤더 - 스크롤 가능 */}
        <div
          ref={headerRef}
          className="flex overflow-hidden"
        >
          {devices.map((deviceTag) => (
            <div
              key={deviceTag}
              className="w-20 border-r border-gray-200 h-6 border-b px-1 py-0.5 bg-gray-50 shrink-0"
            >
              <div className="text-xs font-medium truncate">{deviceTag}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 스크롤 가능한 타임라인 */}
      <div
        ref={timelineRef}
        className="overflow-auto max-h-[calc(100vh-16rem)]"
        onScroll={(e) => {
          if (headerRef.current) {
            headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
      >
        <div className="flex min-w-fit">
          {/* 날짜 레이블 열 - 절대 고정 */}
          <div className="w-24 shrink-0 border-r border-gray-200 bg-white sticky left-0 z-20">
            {/* 이전 데이터 로드 버튼 */}
            <Button
              variant="ghost"
              className="w-full h-6 bg-green-200 border-b border-gray-200 flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-green-300"
              onClick={handleLoadPrevious}
              disabled={loadingPrevious || loading}
            >
              {loadingPrevious ? (
                <div className="animate-spin rounded-full h-2 w-2 border-b border-gray-600"></div>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span className="hidden sm:inline text-xs">이전</span>
                </>
              )}
            </Button>

            {/* 날짜 목록 */}
            {timeSlots.map((slot) => {
              const date = new Date(slot.date);
              const dayOfWeek = date.getDay();
              const isSaturday = dayOfWeek === 6;
              const isSunday = dayOfWeek === 0;
              
              return (
                <div
                  key={slot.date}
                  className="h-6 border-b border-gray-200 flex items-center justify-center text-xs font-medium bg-gray-50"
                >
                  <span className={
                    isSaturday ? "text-blue-600" : 
                    isSunday ? "text-red-600" : 
                    "text-gray-900"
                  }>
                    {format(date, "MM/dd", { locale: ko })}
                  </span>
                  <span className={`ml-1 ${
                    isSaturday ? "text-blue-600" : 
                    isSunday ? "text-red-600" : 
                    "text-gray-600"
                  }`}>
                    ({format(date, "EEE", { locale: ko })})
                  </span>
                </div>
              );
            })}

            {/* 다음 데이터 로드 버튼 */}
            <Button
              variant="ghost"
              className="w-full h-6 bg-green-200 border-b border-gray-200 flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-green-300"
              onClick={handleLoadNext}
              disabled={loadingNext || loading}
            >
              {loadingNext ? (
                <div className="animate-spin rounded-full h-2 w-2 border-b border-gray-600"></div>
              ) : (
                <>
                  <span className="hidden sm:inline text-xs">다음</span>
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </Button>
          </div>

          {/* 기기별 열 */}
          {devices.map((deviceTag) => (
            <div
              key={deviceTag}
              className="w-20 border-r border-gray-200 relative shrink-0"
            >
              {/* 이전 데이터 로드 버튼 공간 */}
              <div className="h-6 border-b border-gray-200" />

              {/* 날짜별 예약 상태 */}
              {timeSlots.map((slot, slotIndex) => {
                const reservationBlock = findReservationBlock(
                  deviceTag,
                  slotIndex
                );
                const isMiddle = isBlockMiddle(deviceTag, slotIndex);

                // 중간 부분이면 빈 공간으로 렌더링 (블록이 차지함)
                if (isMiddle) {
                  return (
                    <div
                      key={`${slot.date}-${deviceTag}`}
                      className="h-6 border-b border-gray-200"
                    />
                  );
                }

                // 블록의 시작 부분
                if (reservationBlock) {
                  const { reservation, duration } = reservationBlock;
                  const blockHeight = duration * 24; // 24px per slot (줄어든 높이)

                  return (
                    <div
                      key={`${slot.date}-${deviceTag}-block`}
                      className={`absolute w-full px-0.5 py-0.5 z-10 border-2 border-gray-400 rounded-sm shadow-sm ${
                        STATUS_MAP[reservation.status]?.color || "bg-blue-50"
                      }`}
                      style={{
                        height: `${blockHeight}px`,
                        top: `${24 + slotIndex * 24}px`, // 로드 버튼 높이(24px) + 슬롯 위치
                      }}
                      title={`${reservation.renter_name}\n상태: ${
                        STATUS_MAP[reservation.status]?.label ||
                        reservation.status
                      }\n대여: ${reservation.pickup_date} ${
                        reservation.pickup_time
                      }\n반납: ${reservation.return_date} ${
                        reservation.return_time
                      }\n방법: ${
                        PICKUP_METHOD_LABELS[reservation.pickup_method] ||
                        reservation.pickup_method
                      } → ${
                        RETURN_METHOD_LABELS[reservation.return_method] ||
                        reservation.return_method
                      }\n사이트: ${reservation.reservation_site}`}
                    >
                      <div className="flex items-center justify-center h-full text-center">
                        <div className="text-xs font-medium truncate">
                          {reservation.renter_name}
                        </div>
                      </div>
                    </div>
                  );
                }

                // 예약이 없는 빈 슬롯
                return (
                  <div
                    key={`${slot.date}-${deviceTag}`}
                    className="h-6 border-b border-gray-200 bg-white"
                  />
                );
              })}

              {/* 다음 데이터 로드 버튼 공간 */}
              <div className="h-6 border-b border-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineView);
