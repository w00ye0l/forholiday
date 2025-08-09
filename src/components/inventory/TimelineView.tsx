"use client";

import React, { useRef, useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { TimeSlot } from "@/lib/inventory-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  RentalReservation,
  STATUS_MAP,
  PICKUP_METHOD_LABELS,
  RETURN_METHOD_LABELS,
  RESERVATION_SITE_LABELS,
} from "@/types/rental";
import { DEVICE_FEATURES } from "@/types/device";

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
  const headerRowRef = useRef<HTMLDivElement>(null);
  const dateColumnRef = useRef<HTMLDivElement>(null);
  const [loadingPrevious, setLoadingPrevious] = React.useState(false);
  const [loadingNext, setLoadingNext] = React.useState(false);

  // 예약 상세 모달 상태
  const [selectedReservation, setSelectedReservation] =
    React.useState<RentalReservation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // 예약 클릭 핸들러
  const handleReservationClick = (reservation: RentalReservation) => {
    setSelectedReservation(reservation);
    setIsDialogOpen(true);
  };

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

  // 예약 데이터 통계
  const totalReservations = timeSlots.reduce(
    (total, slot) => total + slot.reservations.length,
    0
  );

  // 디버깅 로그 추가
  console.log("🖥️ TimelineView 렌더링:", {
    devices,
    timeSlots,
    deviceCount: devices.length,
    slotCount: timeSlots.length,
    totalReservations,
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

  // 기기는 있지만 예약이 없는 경우
  if (totalReservations === 0) {
    console.log("⚠️ TimelineView: 예약 없음");
    return (
      <div className="bg-white rounded-lg border border-gray-200 w-full h-full">
        <div className="p-8 text-center">
          <div className="text-gray-600 mb-4">
            <div className="text-lg font-medium">
              선택한 기간에 예약이 없습니다
            </div>
            <div className="text-sm mt-2">
              기기 {devices.length}개가 모두 사용 가능한 상태입니다
            </div>
            <div className="text-xs text-gray-500 mt-1">
              날짜 범위: {format(startDate, "yyyy-MM-dd", { locale: ko })} ~{" "}
              {format(endDate, "yyyy-MM-dd", { locale: ko })}
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={handleLoadPrevious}
              disabled={loadingPrevious}
            >
              이전 기간 보기
            </Button>
            <Button
              variant="outline"
              onClick={handleLoadNext}
              disabled={loadingNext}
            >
              다음 기간 보기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 w-full h-full overflow-hidden">
        {/* 고정된 헤더 행 */}
        <div className="flex bg-gray-50 border-b border-gray-200">
          {/* 날짜 헤더 - 완전 고정 */}
          <div className="w-20 h-6 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center font-medium text-xs">
            날짜
          </div>
          {/* 기기 헤더 - 완전 고정 */}
          <div className="flex-1 h-6 bg-gray-50 overflow-hidden relative">
            <div
              ref={headerRowRef}
              className="flex h-6 overflow-x-scroll scrollbar-hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {devices.map((deviceTag) => (
                <div
                  key={deviceTag}
                  className="w-16 sm:w-20 border-r border-gray-200 px-1 py-0.5 bg-gray-50 flex-shrink-0"
                >
                  <div className="text-xs font-medium truncate">
                    {deviceTag}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 스크롤 가능한 컨텐츠 영역 */}
        <div className="flex flex-1 min-h-0">
          {/* 날짜 컬럼 - 완전 고정 */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden">
            <div
              ref={dateColumnRef}
              className="h-full overflow-y-scroll scrollbar-hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
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
                    <span
                      className={
                        isSaturday
                          ? "text-blue-600"
                          : isSunday
                          ? "text-red-600"
                          : "text-gray-900"
                      }
                    >
                      {format(date, "MM/dd", { locale: ko })}
                    </span>
                    <span
                      className={`ml-1 ${
                        isSaturday
                          ? "text-blue-600"
                          : isSunday
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      ({format(date, "E", { locale: ko })})
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
          </div>

          {/* 타임라인 컨텐츠 영역 - 스크롤 가능 */}
          <div className="flex-1 overflow-hidden">
            <div
              ref={timelineRef}
              className="w-full h-full overflow-auto"
              onScroll={(e) => {
                const target = e.currentTarget;

                // 가로 스크롤은 헤더와 동기화
                if (headerRowRef.current) {
                  headerRowRef.current.scrollLeft = target.scrollLeft;
                }

                // 세로 스크롤은 날짜 컬럼과 동기화
                if (dateColumnRef.current) {
                  dateColumnRef.current.scrollTop = target.scrollTop;
                }
              }}
            >
              <div className="flex min-w-fit">
                {/* 기기별 열 */}
                {devices.map((deviceTag) => (
                  <div
                    key={deviceTag}
                    className="w-16 sm:w-20 border-r border-gray-200 relative flex-shrink-0"
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
                        const blockHeight = duration * 24; // 24px per slot

                        return (
                          <div
                            key={`${slot.date}-${deviceTag}-block`}
                            className={`absolute w-full px-0.5 py-0.5 z-10 border-2 border-gray-400 rounded-sm shadow-sm cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${
                              STATUS_MAP[reservation.status]?.color ||
                              "bg-blue-50"
                            }`}
                            style={{
                              height: `${blockHeight}px`,
                              top: `${24 + slotIndex * 24}px`, // 로드 버튼 높이(24px) + 슬롯 위치
                            }}
                            onClick={() => handleReservationClick(reservation)}
                            title={`${reservation.renter_name} - 클릭하여 상세정보 보기`}
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
        </div>
      </div>

      {/* 예약 상세 모달 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              예약 상세 정보
              {selectedReservation && (
                <Badge
                  variant={
                    STATUS_MAP[selectedReservation.status]?.variant || "default"
                  }
                >
                  {STATUS_MAP[selectedReservation.status]?.label ||
                    selectedReservation.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-4">
              {/* 예약 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      예약 번호
                    </label>
                    <p className="text-sm font-semibold">
                      {selectedReservation.reservation_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      대여자명
                    </label>
                    <p className="text-sm">{selectedReservation.renter_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      연락처
                    </label>
                    <p className="text-sm">
                      {selectedReservation.renter_phone}
                    </p>
                  </div>
                  {selectedReservation.renter_email && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">
                        이메일
                      </label>
                      <p className="text-sm">
                        {selectedReservation.renter_email}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      기기 카테고리
                    </label>
                    <p className="text-sm">
                      {selectedReservation.device_category}
                    </p>
                  </div>
                  {selectedReservation.device_tag_name && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">
                        할당 기기
                      </label>
                      <p className="text-sm font-semibold text-blue-600">
                        {selectedReservation.device_tag_name}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      예약 사이트
                    </label>
                    <p className="text-sm">
                      {RESERVATION_SITE_LABELS[
                        selectedReservation.reservation_site
                      ] || selectedReservation.reservation_site}
                    </p>
                  </div>
                  {selectedReservation.order_number && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">
                        주문 번호
                      </label>
                      <p className="text-sm">
                        {selectedReservation.order_number}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 대여 정보 */}
              <div className="border-t pt-3">
                <h3 className="text-base font-semibold mb-2">대여 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      대여 일시
                    </label>
                    <p className="text-sm font-medium">
                      {format(
                        new Date(selectedReservation.pickup_date),
                        "yyyy년 MM월 dd일",
                        { locale: ko }
                      )}{" "}
                      {selectedReservation.pickup_time}
                    </p>
                    <p className="text-xs text-gray-600">
                      {PICKUP_METHOD_LABELS[
                        selectedReservation.pickup_method
                      ] || selectedReservation.pickup_method}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      반납 일시
                    </label>
                    <p className="text-sm font-medium">
                      {format(
                        new Date(selectedReservation.return_date),
                        "yyyy년 MM월 dd일",
                        { locale: ko }
                      )}{" "}
                      {selectedReservation.return_time}
                    </p>
                    <p className="text-xs text-gray-600">
                      {RETURN_METHOD_LABELS[
                        selectedReservation.return_method
                      ] || selectedReservation.return_method}
                    </p>
                  </div>
                </div>
              </div>

              {/* 추가 옵션 */}
              {(DEVICE_FEATURES.PHONE_CATEGORIES.includes(
                selectedReservation.device_category
              ) ||
                (DEVICE_FEATURES.CAMERA_CATEGORIES.includes(
                  selectedReservation.device_category
                ) &&
                  selectedReservation.sd_option)) && (
                <div className="border-t pt-3">
                  <h3 className="text-base font-semibold mb-2">추가 옵션</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* 핸드폰 기기는 데이터 전송만 표시 */}
                    {DEVICE_FEATURES.PHONE_CATEGORIES.includes(
                      selectedReservation.device_category
                    ) && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">
                          데이터 전송
                        </label>
                        <p className="text-sm">
                          {selectedReservation.data_transmission
                            ? "✅ 신청"
                            : "❌ 미신청"}
                        </p>
                      </div>
                    )}
                    {/* 카메라 기기는 SD 옵션만 표시 (값이 있을 때만) */}
                    {DEVICE_FEATURES.CAMERA_CATEGORIES.includes(
                      selectedReservation.device_category
                    ) &&
                      selectedReservation.sd_option && (
                        <div>
                          <label className="text-xs font-medium text-gray-500">
                            SD 옵션
                          </label>
                          <p className="text-sm">
                            {selectedReservation.sd_option}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* 주소 */}
              <div className="border-t pt-3">
                <label className="text-xs font-medium text-gray-500">
                  주소
                </label>
                <p className="text-sm">{selectedReservation.renter_address}</p>
              </div>

              {/* 설명 */}
              {selectedReservation.description && (
                <div className="border-t pt-3">
                  <label className="text-xs font-medium text-gray-500">
                    메모
                  </label>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedReservation.description}
                  </p>
                </div>
              )}

              {/* 예약 일시 */}
              <div className="border-t pt-3 text-xs text-gray-500">
                <p>
                  생성일:{" "}
                  {format(
                    new Date(selectedReservation.created_at),
                    "yyyy년 MM월 dd일 HH:mm",
                    { locale: ko }
                  )}
                </p>
                <p>
                  수정일:{" "}
                  {format(
                    new Date(selectedReservation.updated_at),
                    "yyyy년 MM월 dd일 HH:mm",
                    { locale: ko }
                  )}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(TimelineView);
