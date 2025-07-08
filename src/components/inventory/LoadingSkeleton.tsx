"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const InventoryLoadingSkeleton = () => {
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-4">
        {/* 메인 타임라인 스켈레톤 */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 헤더 행 스켈레톤 */}
                <div className="flex overflow-hidden bg-gray-50 rounded">
                  <div className="w-32 shrink-0 border-r border-gray-200">
                    <Skeleton className="h-8 w-16 m-2" />
                  </div>
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className="w-40 min-w-[10rem] border-r border-gray-200 last:border-r-0 p-2"
                      >
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 데이터 행들 스켈레톤 */}
                <div className="flex overflow-hidden">
                  <div className="w-32 shrink-0 border-r border-gray-200">
                    {/* 날짜 열 스켈레톤 */}
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className="h-12 border-b border-gray-200 flex items-center justify-center"
                      >
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>

                  {/* 기기별 열 스켈레톤 */}
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, deviceIndex) => (
                      <div
                        key={deviceIndex}
                        className="w-40 min-w-[10rem] border-r border-gray-200 last:border-r-0"
                      >
                        {Array.from({ length: 8 }, (_, dateIndex) => (
                          <div
                            key={dateIndex}
                            className="h-12 border-b border-gray-200 p-1"
                          >
                            {/* 랜덤하게 일부 셀에만 예약 스켈레톤 표시 */}
                            {Math.random() > 0.6 && (
                              <div className="space-y-1">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-2 w-12" />
                                <Skeleton className="h-4 w-14 rounded-full" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 사이드바 스켈레톤 */}
        <div className="w-80">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 전체 선택/해제 버튼 스켈레톤 */}
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>

              {/* 카테고리 필터 스켈레톤 */}
              <div className="space-y-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-8 ml-auto" />
                  </div>
                ))}
              </div>

              {/* 통계 정보 스켈레톤 */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// 컴팩트한 로딩 스켈레톤 (빠른 로딩용)
export const CompactLoadingSkeleton = () => {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// 에러 상태용 재시도 스켈레톤
export const RetryLoadingSkeleton = () => {
  return (
    <div className="p-4">
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-48 mx-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
