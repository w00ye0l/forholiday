"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { inventoryManager } from "@/lib/inventory-manager";
import {
  DeviceCategory,
  InventoryStatus,
  DEVICE_CATEGORY_LABELS,
} from "@/types/device";
import { RentalReservation } from "@/types/rental";
import { AlertTriangle, Package, Zap, Wrench, TrendingUp } from "lucide-react";

export const InventoryDashboard = () => {
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus[]>([]);
  const [overdueReservations, setOverdueReservations] = useState<
    RentalReservation[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<
    DeviceCategory | "all"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [status, overdue] = await Promise.all([
        inventoryManager.getInventoryStatus(
          selectedCategory === "all" ? undefined : selectedCategory
        ),
        inventoryManager.getOverdueReservations(),
      ]);

      setInventoryStatus(status);
      setOverdueReservations(overdue);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "데이터 로드 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, [selectedCategory]);

  const totalDevices = inventoryStatus.reduce(
    (sum, item) => sum + item.total_devices,
    0
  );
  const totalAvailable = inventoryStatus.reduce(
    (sum, item) => sum + item.available_devices,
    0
  );
  const totalRented = inventoryStatus.reduce(
    (sum, item) => sum + item.rented_devices,
    0
  );
  const totalMaintenance = inventoryStatus.reduce(
    (sum, item) => sum + item.maintenance_devices,
    0
  );
  const averageUtilization =
    totalDevices > 0 ? (totalRented / totalDevices) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center space-x-2 p-4">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <p className="text-red-800">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 필터 컨트롤 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">기기 재고 현황</h2>
        <div className="flex items-center space-x-4">
          <Select
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as DeviceCategory | "all")
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 카테고리</SelectItem>
              {Object.entries(DEVICE_CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadInventoryData} variant="outline">
            새로고침
          </Button>
        </div>
      </div>

      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 기기</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">등록된 기기 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용 가능</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalAvailable}
            </div>
            <p className="text-xs text-muted-foreground">즉시 대여 가능</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대여 중</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalRented}
            </div>
            <p className="text-xs text-muted-foreground">현재 사용 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">점검/수리</CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalMaintenance}
            </div>
            <p className="text-xs text-muted-foreground">사용 불가 상태</p>
          </CardContent>
        </Card>
      </div>

      {/* 연체 알림 */}
      {overdueReservations.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center space-x-2 p-4">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-red-800">
              <strong>{overdueReservations.length}건의 반납 지연 예약</strong>이
              있습니다. 즉시 확인이 필요합니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 카테고리별 상세 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventoryStatus.map((status) => (
          <Card key={status.category}>
            <CardHeader>
              <CardTitle className="text-lg">
                {DEVICE_CATEGORY_LABELS[status.category]}
              </CardTitle>
              <CardDescription>
                활용률: {status.utilization_rate.toFixed(1)}%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">전체</span>
                <Badge variant="outline">{status.total_devices}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">사용 가능</span>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  {status.available_devices}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">대여 중</span>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {status.rented_devices}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">점검/수리</span>
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                  {status.maintenance_devices}
                </Badge>
              </div>

              {/* 활용률 시각화 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>활용률</span>
                  <span>{status.utilization_rate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(status.utilization_rate, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 빈 상태 */}
      {inventoryStatus.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-32">
            <Package className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              표시할 재고 데이터가 없습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
