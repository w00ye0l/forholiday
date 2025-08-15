"use client";

import { useRef, useMemo, useState, memo, useEffect } from "react";
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
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  // 예약 상세 모달 상태
  const [selectedReservation, setSelectedReservation] =
    useState<RentalReservation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 예약 클릭 핸들러
  const handleReservationClick = (reservation: RentalReservation) => {
    setSelectedReservation(reservation);
    setIsDialogOpen(true);
  };

  // 기기 태그를 오름차순으로 정렬
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => a.localeCompare(b));
  }, [devices]);

  // 스크롤바 너비 계산
  useEffect(() => {
    const calculateScrollbarWidth = () => {
      if (timelineRef.current) {
        const element = timelineRef.current;
        const scrollWidth = element.offsetWidth - element.clientWidth;
        setScrollbarWidth(scrollWidth);
      }
    };

    calculateScrollbarWidth();
    window.addEventListener('resize', calculateScrollbarWidth);
    
    return () => {
      window.removeEventListener('resize', calculateScrollbarWidth);
    };
  }, [timeSlots, devices]);

  // 성능 최적화: 예약 블록 계산 (메모이제이션)
  const reservationBlocks = useMemo(() => {
    const blocks = new Map<string, ReservationBlock[]>();
    const globalProcessedReservations = new Set<string>();
    
    // 성능 최적화: 날짜별 인덱스 맵 생성 (findIndex 반복 호출 방지)
    const dateToIndexMap = new Map<string, number>();
    timeSlots.forEach((slot, index) => {
      dateToIndexMap.set(slot.date, index);
    });

    // 성능 최적화: for 루프 사용
    for (const deviceTag of sortedDevices) {
      const deviceBlocks: ReservationBlock[] = [];
      const deviceReservations: RentalReservation[] = [];
      
      // 모든 타임슬롯에서 해당 기기의 예약들을 수집
      for (const slot of timeSlots) {
        for (const reservation of slot.reservations) {
          if (
            reservation.device_tag_name === deviceTag &&
            !globalProcessedReservations.has(reservation.reservation_id)
          ) {
            deviceReservations.push(reservation);
            globalProcessedReservations.add(reservation.reservation_id);
          }
        }
      }

      // 수집된 예약들에 대해 블록 생성 (최적화된 인덱스 조회)
      for (const reservation of deviceReservations) {
        const startIndex = dateToIndexMap.get(reservation.pickup_date);
        const endIndex = dateToIndexMap.get(reservation.return_date);

        if (startIndex !== undefined && endIndex !== undefined) {
          const duration = endIndex - startIndex + 1;

          deviceBlocks.push({
            reservation,
            startIndex,
            endIndex,
            duration,
          });
        }
      }

      blocks.set(deviceTag, deviceBlocks);
    }

    return blocks;
  }, [sortedDevices, timeSlots]);

  // 예약 데이터 통계
  const totalReservations = timeSlots.reduce(
    (total, slot) => total + slot.reservations.length,
    0
  );


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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-600">예약 정보가 없습니다.</div>
      </div>
    );
  }

  if (sortedDevices.length === 0) {
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
    return (
      <div className="bg-white rounded-lg border border-gray-200 w-full h-full">
        <div className="p-8 text-center">
          <div className="text-gray-600 mb-4">
            <div className="text-lg font-medium">
              선택한 기간에 예약이 없습니다
            </div>
            <div className="text-sm mt-2">
              기기 {sortedDevices.length}개가 모두 사용 가능한 상태입니다
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
      <div className="bg-white rounded-lg border border-gray-200 w-full h-full relative flex flex-col">
        {/* 상단 좌측 코너 고정 셀 */}
        <div className="absolute top-0 left-0 w-20 h-8 bg-gray-100 border-r border-b border-gray-300 flex items-center justify-center font-medium text-xs z-30">
          날짜
        </div>

        {/* 상단 헤더 행 - 가로 스크롤 가능, 세로 고정 */}
        <div 
          className="absolute top-0 left-20 h-8 bg-gray-50 border-b border-gray-300 overflow-hidden z-20"
          style={{ 
            right: `${scrollbarWidth}px` 
          }}
        >
          <div
            ref={headerRowRef}
            className="flex h-full overflow-x-auto overflow-y-hidden scrollbar-hidden border-r border-gray-200"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {sortedDevices.map((deviceTag, index) => (
              <div
                key={deviceTag}
                className={`w-16 sm:w-20 px-1 py-1 bg-gray-50 flex-shrink-0 flex items-center justify-center ${
                  index < sortedDevices.length - 1 ? 'border-r border-gray-200' : ''
                }`}
              >
                <div className="text-xs font-medium truncate">
                  {deviceTag}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 좌측 날짜 컬럼 - 세로 스크롤 가능, 가로 고정 */}
        <div 
          className="absolute top-8 left-0 w-20 bg-white border-r border-gray-300 overflow-hidden z-20"
          style={{ 
            bottom: `${scrollbarWidth}px` 
          }}
        >
          <div
            ref={dateColumnRef}
            className="h-full overflow-y-auto overflow-x-hidden scrollbar-hidden"
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

        {/* 메인 타임라인 컨텐츠 영역 - 스크롤 가능 */}
        <div className="absolute top-8 left-20 right-0 bottom-0 overflow-hidden">
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
            <div className="flex min-w-fit border-r border-gray-200">
              {/* 기기별 열 */}
              {sortedDevices.map((deviceTag, index) => (
                <div
                  key={deviceTag}
                  className={`w-16 sm:w-20 relative flex-shrink-0 ${
                    index < sortedDevices.length - 1 ? 'border-r border-gray-200' : ''
                  }`}
                >
                  {/* 이전 데이터 로드 버튼 공간 */}
                  <div className="h-6 border-b border-gray-200" />

                  {/* 날짜별 예약 상태 */}
                  {timeSlots.map((slot) => (
                    <div
                      key={`${slot.date}-${deviceTag}`}
                      className="h-6 border-b border-gray-200 bg-white"
                    />
                  ))}

                  {/* 예약 블록들을 absolute로 오버레이 */}
                  {(reservationBlocks.get(deviceTag) || []).map((block) => {
                    const { reservation, duration, startIndex } = block;
                    const blockHeight = duration * 24; // 24px per slot

                    return (
                      <div
                        key={`${reservation.reservation_id}-${deviceTag}-block`}
                        className={`absolute w-full px-0.5 py-0.5 z-10 border-2 border-gray-400 rounded-sm shadow-sm cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${
                          STATUS_MAP[reservation.status]?.color ||
                          "bg-blue-50"
                        }`}
                        style={{
                          height: `${blockHeight}px`,
                          top: `${24 + startIndex * 24}px`, // 로드 버튼 높이(24px) + 슬롯 위치
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
                  })}

                  {/* 다음 데이터 로드 버튼 공간 */}
                  <div className="h-6 border-b border-gray-200" />
                </div>
              ))}
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
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      할당 기기
                    </label>
                    {(selectedReservation as any).original_device_tag_name ? (
                      <p className="text-sm font-semibold text-blue-600">
                        {(selectedReservation as any).original_device_tag_name}
                      </p>
                    ) : selectedReservation.device_tag_name && !(selectedReservation as any).hasOwnProperty('original_device_tag_name') ? (
                      <p className="text-sm font-semibold text-blue-600">
                        {selectedReservation.device_tag_name}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-gray-400">
                        미할당
                      </p>
                    )}
                  </div>
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

export default memo(TimelineView);
