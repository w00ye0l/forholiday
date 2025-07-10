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
          !processedReservations.has(reservation.reservation_id)
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
    const newStartDate = new Date(startDate);
    newStartDate.setDate(newStartDate.getDate() - daysToShow);
    await onLoadMore(newStartDate, endDate);
  };

  const handleLoadNext = async () => {
    const newEndDate = new Date(endDate);
    newEndDate.setDate(newEndDate.getDate() + daysToShow);
    await onLoadMore(startDate, newEndDate);
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
      <div
        ref={headerRef}
        className="sticky top-0 z-10 flex overflow-hidden bg-gray-50"
      >
        {/* 날짜 레이블 헤더 */}
        <div className="w-24 shrink-0 border-r border-gray-200">
          <div className="h-8 border-b border-gray-200 flex items-center justify-center font-medium">
            날짜
          </div>
        </div>

        {/* 기기 헤더 */}
        <div className="flex">
          {devices.map((deviceTag, deviceIdx) => (
            <div
              key={deviceTag}
              className="w-32 min-w-[8rem] border-r border-gray-200"
            >
              <div className="h-8 border-b border-gray-200 p-2">
                <div className="text-sm font-medium">{deviceTag}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 스크롤 가능한 타임라인 */}
      <div
        ref={timelineRef}
        className="flex overflow-auto max-h-[calc(100vh-16rem)]"
        onScroll={(e) => {
          if (headerRef.current) {
            headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
      >
        {/* 날짜 레이블 열 */}
        <div className="w-24 shrink-0 border-r border-gray-200">
          {/* 이전 데이터 로드 버튼 */}
          <Button
            variant="ghost"
            className="w-full h-8 bg-green-200 border-b border-gray-200 flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-green-300"
            onClick={handleLoadPrevious}
            disabled={loading}
          >
            <ChevronUp className="w-4 h-4" />
            이전 날짜
          </Button>

          {/* 날짜 목록 */}
          {timeSlots.map((slot) => (
            <div
              key={slot.date}
              className="h-8 border-b border-gray-200 flex items-center justify-center text-xs font-medium bg-gray-50"
            >
              {format(new Date(slot.date), "MM/dd (eee)", { locale: ko })}
            </div>
          ))}

          {/* 다음 데이터 로드 버튼 */}
          <Button
            variant="ghost"
            className="w-full h-8 bg-green-200 border-b border-gray-200 flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-green-300"
            onClick={handleLoadNext}
            disabled={loading}
          >
            다음 날짜
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        {/* 기기별 열 */}
        <div className="flex border-r border-gray-200">
          {devices.map((deviceTag) => (
            <div
              key={deviceTag}
              className="w-32 min-w-[8rem] border-r border-gray-200 relative"
            >
              {/* 이전 데이터 로드 버튼 공간 */}
              <div className="h-8 border-b border-gray-200" />

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
                      className="h-8 border-b border-gray-200"
                    />
                  );
                }

                // 블록의 시작 부분
                if (reservationBlock) {
                  const { reservation, duration } = reservationBlock;
                  const blockHeight = duration * 32; // 16 * 4 = 64px per slot + border

                  return (
                    <div
                      key={`${slot.date}-${deviceTag}-block`}
                      className={`absolute w-full p-1 z-10 border-b border-gray-200 ${
                        STATUS_MAP[reservation.status]?.color || "bg-blue-50"
                      }`}
                      style={{
                        height: `${blockHeight}px`,
                        top: `${32 + slotIndex * 32}px`, // 로드 버튼 높이(64px) + 슬롯 위치(각 슬롯 64px + 보더 1px)
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
                      <div className="flex flex-col h-full justify-between">
                        <div className="text-xs font-medium truncate">
                          {reservation.renter_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>{reservation.pickup_date}</div>
                          <div>~{reservation.return_date}</div>
                        </div>
                        <div
                          className={`text-xs font-medium text-center px-1 py-0.5 rounded ${
                            STATUS_MAP[reservation.status]?.badge ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {STATUS_MAP[reservation.status]?.label ||
                            reservation.status}
                        </div>
                      </div>
                    </div>
                  );
                }

                // 예약이 없는 빈 슬롯
                return (
                  <div
                    key={`${slot.date}-${deviceTag}`}
                    className="h-8 border-b border-gray-200 bg-white"
                  />
                );
              })}

              {/* 다음 데이터 로드 버튼 공간 */}
              <div className="h-8 border-b border-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineView);
