"use client";

import { useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Package,
  MapPin,
  TrendingUp,
  Save,
  Clock,
  User,
  Phone,
} from "lucide-react";
import type { RentalReservation } from "@/types/rental";
import type { StorageReservation } from "@/types/storage";
import { DEVICE_CATEGORY_LABELS } from "@/types/device";
import { toast } from "sonner";

interface DashboardStats {
  todayRentals: RentalReservation[];
  tomorrowRentals: RentalReservation[];
  todayStorage: StorageReservation[];
  tomorrowStorage: StorageReservation[];
  totalDevicesAvailable: number;
}

interface TerminalNotes {
  T1: string;
  T2: string;
}

interface CategoryGroup {
  category: string;
  categoryLabel: string;
  count: number;
  rentals: RentalReservation[];
}

export default function Page() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRentals: [],
    tomorrowRentals: [],
    todayStorage: [],
    tomorrowStorage: [],
    totalDevicesAvailable: 0,
  });
  const [loading, setLoading] = useState(true);
  const [terminalNotes, setTerminalNotes] = useState<TerminalNotes>({
    T1: "",
    T2: "",
  });
  const [savingNotes, setSavingNotes] = useState<{ T1: boolean; T2: boolean }>({
    T1: false,
    T2: false,
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 오늘/내일 렌탈 출고 예정
        const { data: todayRentals } = await supabase
          .from("rental_reservations")
          .select("*")
          .eq("pickup_date", today)
          .in("status", ["pending", "picked_up"]);

        const { data: tomorrowRentals } = await supabase
          .from("rental_reservations")
          .select("*")
          .eq("pickup_date", tomorrow)
          .in("status", ["pending", "picked_up"]);

        // 오늘/내일 보관 입고/출고 예정
        const { data: todayStorage } = await supabase
          .from("storage_reservations")
          .select("*")
          .or(`drop_off_date.eq.${today},pickup_date.eq.${today}`)
          .in("status", ["pending", "stored"]);

        const { data: tomorrowStorage } = await supabase
          .from("storage_reservations")
          .select("*")
          .or(`drop_off_date.eq.${tomorrow},pickup_date.eq.${tomorrow}`)
          .in("status", ["pending", "stored"]);

        // 이용 가능한 기기 수
        const { count: availableDevices } = await supabase
          .from("devices")
          .select("*", { count: "exact", head: true })
          .eq("status", "available");

        // 터미널 특이사항 로드
        const { data: terminalNotesData } = await supabase
          .from("terminal_notes")
          .select("*");

        const notesMap: TerminalNotes = { T1: "", T2: "" };
        terminalNotesData?.forEach((note) => {
          notesMap[note.terminal_id as "T1" | "T2"] = note.notes;
        });

        setStats({
          todayRentals: todayRentals || [],
          tomorrowRentals: tomorrowRentals || [],
          todayStorage: todayStorage || [],
          tomorrowStorage: tomorrowStorage || [],
          totalDevicesAvailable: availableDevices || 0,
        });
        setTerminalNotes(notesMap);
      } catch (error) {
        console.error("대시보드 데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [today, tomorrow]);

  const handleSaveNotes = async (terminal: "T1" | "T2") => {
    setSavingNotes((prev) => ({ ...prev, [terminal]: true }));

    try {
      const { error } = await supabase.from("terminal_notes").upsert(
        {
          terminal_id: terminal,
          notes: terminalNotes[terminal],
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "terminal_id",
        }
      );

      if (error) {
        throw error;
      }

      // 성공 피드백
      setTimeout(() => {
        setSavingNotes((prev) => ({ ...prev, [terminal]: false }));
        toast.success("특이사항이 저장되었습니다.");
      }, 1000);
    } catch (error) {
      console.error("특이사항 저장 실패:", error);
      alert("특이사항 저장에 실패했습니다.");
      setSavingNotes((prev) => ({ ...prev, [terminal]: false }));
    }
  };

  const handleNotesChange = (terminal: "T1" | "T2", value: string) => {
    setTerminalNotes((prev) => ({
      ...prev,
      [terminal]: value,
    }));
  };

  // T1, T2별 렌탈 필터링 함수
  const getRentalsByTerminal = (
    rentals: RentalReservation[],
    terminal: "T1" | "T2"
  ) => rentals.filter((rental) => rental.pickup_method === terminal);

  // 카테고리별 그룹화 함수
  const groupRentalsByCategory = (
    rentals: RentalReservation[]
  ): CategoryGroup[] => {
    const categoryMap = new Map<string, RentalReservation[]>();

    // 모든 가능한 카테고리를 0으로 초기화
    Object.keys(DEVICE_CATEGORY_LABELS).forEach((category) => {
      categoryMap.set(category, []);
    });

    // 실제 렌탈 데이터로 카운트 업데이트
    rentals.forEach((rental) => {
      const category = rental.device_category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(rental);
    });

    return Array.from(categoryMap.entries())
      .map(([category, categoryRentals]) => ({
        category,
        categoryLabel:
          DEVICE_CATEGORY_LABELS[
            category as keyof typeof DEVICE_CATEGORY_LABELS
          ] || category,
        count: categoryRentals.length,
        rentals: categoryRentals.sort((a, b) =>
          a.pickup_time.localeCompare(b.pickup_time)
        ),
      }))
      .sort((a, b) => {
        // 0건인 항목들은 마지막에, 나머지는 수량 많은 순으로 정렬
        if (a.count === 0 && b.count === 0)
          return a.categoryLabel.localeCompare(b.categoryLabel);
        if (a.count === 0) return 1;
        if (b.count === 0) return -1;
        return b.count - a.count;
      });
  };

  // 터미널별 카테고리 그룹 렌더링
  const renderTerminalCategories = (
    rentals: RentalReservation[],
    terminal: "T1" | "T2",
    colorClass: string,
    bgColorClass: string
  ) => {
    const terminalRentals = getRentalsByTerminal(rentals, terminal);
    const categoryGroups = groupRentalsByCategory(terminalRentals).filter(
      (group) => group.count > 0
    );

    if (loading) {
      return <div className="text-center py-4 text-gray-500">로딩 중...</div>;
    }

    if (categoryGroups.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          출고 예정인 기기가 없습니다
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {categoryGroups.map((group) => (
          <div
            key={group.category}
            className={`p-3 ${bgColorClass} border ${colorClass.replace(
              "text-",
              "border-"
            )} rounded-lg`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`font-semibold ${colorClass} flex items-center gap-2 text-sm`}
              >
                <Package className="w-4 h-4" />
                {group.categoryLabel}
              </div>
              <Badge variant="outline" className="text-xs">
                {group.count}건
              </Badge>
            </div>

            <div className="grid gap-2">
              {group.rentals.map((rental) => (
                <div
                  key={rental.id}
                  className="bg-white/70 p-2 rounded text-xs border"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-gray-900 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {rental.renter_name}
                    </div>
                    <Badge
                      variant={
                        rental.status === "picked_up" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {rental.status === "picked_up" ? "수령완료" : "수령전"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {rental.pickup_time}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {rental.renter_phone}
                    </div>
                  </div>
                  {rental.description && (
                    <div className="mt-1 text-gray-500 italic text-xs">
                      {rental.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4 py-8 px-4">
      {/* 헤더 */}
      <div className="flex flex-col">
        <h1 className="text-2xl md:text-3xl font-bold">직원 대시보드</h1>
        <p className="text-gray-600 mt-1">
          {format(new Date(), "yyyy년 MM월 dd일 EEEE", { locale: ko })}
        </p>
      </div>
      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-4">
        {/* 오늘 출고 예정 - 카테고리별 */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              오늘 출고 예정
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="text-2xl font-bold mb-2">
              {stats.todayRentals.length}건
            </div>
            <div className="space-y-1">
              {/* 예약이 있는 상위 3개 카테고리 */}
              {groupRentalsByCategory(stats.todayRentals)
                .filter((group) => group.count > 0)
                .slice(0, 3)
                .map((group) => (
                  <div
                    key={group.category}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-600 truncate">
                      {group.categoryLabel}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {group.count}
                    </Badge>
                  </div>
                ))}

              {/* 0건 카테고리가 있을 경우 요약 표시 */}
              {groupRentalsByCategory(stats.todayRentals).filter(
                (group) => group.count === 0
              ).length > 0 && (
                <div className="text-xs text-gray-400 italic">
                  {
                    groupRentalsByCategory(stats.todayRentals).filter(
                      (group) => group.count === 0
                    ).length
                  }
                  개 카테고리 예약 없음
                </div>
              )}

              {/* 3개 초과 예약 카테고리가 있을 경우 */}
              {groupRentalsByCategory(stats.todayRentals).filter(
                (group) => group.count > 0
              ).length > 3 && (
                <div className="text-xs text-blue-600">
                  +
                  {groupRentalsByCategory(stats.todayRentals).filter(
                    (group) => group.count > 0
                  ).length - 3}
                  개 카테고리 더 있음
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 내일 출고 예정 - 카테고리별 */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">
              내일 출고 예정
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="text-2xl font-bold mb-2">
              {stats.tomorrowRentals.length}건
            </div>
            <div className="space-y-1">
              {/* 예약이 있는 상위 3개 카테고리 */}
              {groupRentalsByCategory(stats.tomorrowRentals)
                .filter((group) => group.count > 0)
                .slice(0, 3)
                .map((group) => (
                  <div
                    key={group.category}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-600 truncate">
                      {group.categoryLabel}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {group.count}
                    </Badge>
                  </div>
                ))}

              {/* 0건 카테고리가 있을 경우 요약 표시 */}
              {groupRentalsByCategory(stats.tomorrowRentals).filter(
                (group) => group.count === 0
              ).length > 0 && (
                <div className="text-xs text-gray-400 italic">
                  {
                    groupRentalsByCategory(stats.tomorrowRentals).filter(
                      (group) => group.count === 0
                    ).length
                  }
                  개 카테고리 예약 없음
                </div>
              )}

              {/* 3개 초과 예약 카테고리가 있을 경우 */}
              {groupRentalsByCategory(stats.tomorrowRentals).filter(
                (group) => group.count > 0
              ).length > 3 && (
                <div className="text-xs text-orange-600">
                  +
                  {groupRentalsByCategory(stats.tomorrowRentals).filter(
                    (group) => group.count > 0
                  ).length - 3}
                  개 카테고리 더 있음
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 오늘 보관 업무 - 터미널별 */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              오늘 보관 업무
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="text-2xl font-bold mb-2">
              {stats.todayStorage.length}건
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">T1 터미널</span>
                <Badge variant="outline" className="text-xs">
                  {
                    stats.todayStorage.filter(
                      (s) => (s as any).terminal === "T1"
                    ).length
                  }
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">T2 터미널</span>
                <Badge variant="outline" className="text-xs">
                  {
                    stats.todayStorage.filter(
                      (s) => (s as any).terminal === "T2"
                    ).length
                  }
                </Badge>
              </div>
              <div className="text-xs text-gray-500 mt-1">입고/출고 포함</div>
            </div>
          </CardContent>
        </Card>

        {/* 이용 가능 기기 - 상위 카테고리별 */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              이용 가능 기기
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="text-2xl font-bold mb-2">
              {stats.totalDevicesAvailable}대
            </div>
            <div className="space-y-1">
              {loading ? (
                <div className="text-xs text-gray-500">로딩 중...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">대여 가능</span>
                    <Badge variant="default" className="text-xs bg-green-500">
                      {stats.totalDevicesAvailable}
                    </Badge>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    즉시 대여 가능
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* 터미널별 특이사항 */}
      <div className="grid md:grid-cols-2 gap-2 md:gap-4">
        {/* T1 터미널 */}
        <Card className="border-blue-500 border-2">
          <CardHeader className="p-3 md:p-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                T1 터미널 특이사항
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaveNotes("T1")}
                disabled={savingNotes.T1}
                className="text-xs px-2 py-1 md:px-3 md:py-2"
              >
                {savingNotes.T1 ? (
                  <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                ) : (
                  <Save className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                )}
                저장
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <Textarea
              placeholder="T1 터미널의 특이사항이나 중요한 공지사항을 입력하세요..."
              value={terminalNotes.T1}
              onChange={(e) => handleNotesChange("T1", e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <div className="text-xs text-gray-500 mt-2">
              모든 직원이 공유 가능한 특이사항
            </div>
          </CardContent>
        </Card>

        {/* T2 터미널 */}
        <Card className="border-green-500 border-2">
          <CardHeader className="p-3 md:p-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                T2 터미널 특이사항
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaveNotes("T2")}
                disabled={savingNotes.T2}
                className="text-xs px-2 py-1 md:px-3 md:py-2"
              >
                {savingNotes.T2 ? (
                  <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                ) : (
                  <Save className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                )}
                저장
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <Textarea
              placeholder="T2 터미널의 특이사항이나 중요한 공지사항을 입력하세요..."
              value={terminalNotes.T2}
              onChange={(e) => handleNotesChange("T2", e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <div className="text-xs text-gray-500 mt-2">
              모든 직원이 공유 가능한 특이사항
            </div>
          </CardContent>
        </Card>
      </div>
      상세 예정 건수
      <div className="grid gap-3 md:gap-6">
        {/* 오늘 출고 예정 상세 */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
              오늘 출고 예정 상세 ({stats.todayRentals.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="grid md:grid-cols-2 gap-3 md:gap-6">
              {/* T1 터미널 */}
              <div>
                <h3 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  T1 터미널 (
                  {getRentalsByTerminal(stats.todayRentals, "T1").length}건)
                </h3>
                {renderTerminalCategories(
                  stats.todayRentals,
                  "T1",
                  "text-blue-700",
                  "bg-blue-50"
                )}
              </div>

              {/* T2 터미널 */}
              <div>
                <h3 className="font-semibold text-green-600 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  T2 터미널 (
                  {getRentalsByTerminal(stats.todayRentals, "T2").length}건)
                </h3>
                {renderTerminalCategories(
                  stats.todayRentals,
                  "T2",
                  "text-green-700",
                  "bg-green-50"
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 내일 출고 예정 상세 */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
              내일 출고 예정 상세 ({stats.tomorrowRentals.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="grid md:grid-cols-2 gap-3 md:gap-6">
              {/* T1 터미널 */}
              <div>
                <h3 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  T1 터미널 (
                  {getRentalsByTerminal(stats.tomorrowRentals, "T1").length}
                  건)
                </h3>
                {renderTerminalCategories(
                  stats.tomorrowRentals,
                  "T1",
                  "text-orange-700",
                  "bg-orange-50"
                )}
              </div>

              {/* T2 터미널 */}
              <div>
                <h3 className="font-semibold text-green-600 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  T2 터미널 (
                  {getRentalsByTerminal(stats.tomorrowRentals, "T2").length}
                  건)
                </h3>
                {renderTerminalCategories(
                  stats.tomorrowRentals,
                  "T2",
                  "text-orange-700",
                  "bg-orange-50"
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
