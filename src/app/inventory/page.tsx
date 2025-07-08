"use client";

import React, { Suspense, lazy } from "react";
import { InventoryErrorBoundary } from "@/components/inventory/ErrorBoundary";
import { InventoryLoadingSkeleton } from "@/components/inventory/LoadingSkeleton";
import { useInventoryData } from "@/hooks/useInventoryData";
import { useAccessibility } from "@/hooks/useAccessibility";
import { useInventoryStore } from "@/lib/inventory-state";
// import { shallow } from "zustand/shallow"; // 제거
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Database, Activity } from "lucide-react";

// 컴포넌트 지연 로딩
const TimelineView = lazy(() =>
  import("@/components/inventory/TimelineView").then((module) => ({
    default: module.TimelineView,
  }))
);

const DeviceFilter = lazy(() =>
  import("@/components/inventory/DeviceFilter").then((module) => ({
    default: module.DeviceFilter,
  }))
);

const DAYS_TO_SHOW = 7; // 과거/미래로 보여줄 날짜 수

// 인벤토리 대시보드 컴포넌트
const InventoryDashboard = React.memo(() => {
  const { loading, error, handleLoadMore } = useInventoryData({
    daysToShow: DAYS_TO_SHOW,
  });

  const { announceToScreenReader, addSkipLink } = useAccessibility();

  const { devices, timeSlots, startDate, endDate } = useInventoryStore();

  // 스킵 링크 추가
  React.useEffect(() => {
    addSkipLink("main-timeline", "메인 타임라인으로 이동");
    addSkipLink("device-filter", "기기 필터로 이동");
  }, [addSkipLink]);

  // 로딩 상태 변경 시 스크린 리더 알림
  React.useEffect(() => {
    if (loading) {
      announceToScreenReader("인벤토리 데이터를 로딩하고 있습니다.", "polite");
    } else {
      announceToScreenReader(
        "인벤토리 데이터 로딩이 완료되었습니다.",
        "polite"
      );
    }
  }, [loading, announceToScreenReader]);

  // 에러 상태 처리
  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              데이터 로딩 오류
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main
      className="container mx-auto px-4 py-8"
      role="main"
      aria-label="인벤토리 관리 대시보드"
      tabIndex={-1}
    >
      {/* 헤더 섹션 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            기기 인벤토리 관리
          </h1>
        </div>

        {/* 상태 인디케이터 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-600">실시간 동기화</span>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Activity className="w-4 h-4 animate-spin" />
              <span>데이터 로딩 중</span>
            </div>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex gap-4">
        {/* 타임라인 뷰 */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                기기 예약 현황
              </CardTitle>
            </CardHeader>
            <CardContent id="main-timeline">
              <Suspense fallback={<InventoryLoadingSkeleton />}>
                <TimelineView
                  devices={devices}
                  timeSlots={timeSlots}
                  startDate={startDate}
                  endDate={endDate}
                  loading={loading}
                  onLoadMore={handleLoadMore}
                  daysToShow={DAYS_TO_SHOW}
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* 필터 사이드바 */}
        <div className="w-80" id="device-filter">
          <Suspense fallback={<InventoryLoadingSkeleton />}>
            <DeviceFilter />
          </Suspense>
        </div>
      </div>
    </main>
  );
});

InventoryDashboard.displayName = "InventoryDashboard";

export default function InventoryPage() {
  return (
    <InventoryErrorBoundary>
      <InventoryDashboard />
    </InventoryErrorBoundary>
  );
}
