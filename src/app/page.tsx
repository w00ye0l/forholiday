"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
} from "lucide-react";
import type { RentalReservation } from "@/types/rental";
import type { StorageReservation } from "@/types/storage";
import { DEVICE_CATEGORY_LABELS, DeviceStatus } from "@/types/device";
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
  const [editingNotes, setEditingNotes] = useState<{
    T1: boolean;
    T2: boolean;
  }>({
    T1: false,
    T2: false,
  });
  const [textareaHeights, setTextareaHeights] = useState<{
    T1: number;
    T2: number;
  }>({
    T1: 120,
    T2: 120,
  });
  const divRefs = useRef<{
    T1: HTMLDivElement | null;
    T2: HTMLDivElement | null;
  }>({
    T1: null,
    T2: null,
  });
  const [originalNotes, setOriginalNotes] = useState<TerminalNotes>({
    T1: "",
    T2: "",
  });
  const [showZeroCategories, setShowZeroCategories] = useState<{
    today: boolean;
    tomorrow: boolean;
  }>({
    today: false,
    tomorrow: false,
  });

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const tomorrow = useMemo(
    () => format(addDays(new Date(), 1), "yyyy-MM-dd"),
    []
  );
  const supabase = useMemo(() => createClient(), []);

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
        const availableStatus: DeviceStatus = "available";
        const { count: availableDevices } = await supabase
          .from("devices")
          .select("*", { count: "exact", head: true })
          .eq("status", availableStatus);

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
      setSavingNotes((prev) => ({ ...prev, [terminal]: false }));
      setEditingNotes((prev) => ({ ...prev, [terminal]: false }));
      toast.success("특이사항이 저장되었습니다.");
    } catch (error) {
      console.error("특이사항 저장 실패:", error);
      alert("특이사항 저장에 실패했습니다.");
      setSavingNotes((prev) => ({ ...prev, [terminal]: false }));
    }
  };

  const handleNotesChange = useCallback(
    (terminal: "T1" | "T2", value: string) => {
      setTerminalNotes((prev) => ({
        ...prev,
        [terminal]: value,
      }));
    },
    []
  );

  const handleEditToggle = (terminal: "T1" | "T2") => {
    if (!editingNotes[terminal]) {
      // 편집 모드로 전환할 때 원본 텍스트 저장
      setOriginalNotes((prev) => ({ ...prev, [terminal]: terminalNotes[terminal] }));
      
      // div의 높이를 측정
      const divElement = divRefs.current[terminal];
      if (divElement) {
        const height = Math.max(divElement.offsetHeight, 120); // 최소 120px
        setTextareaHeights((prev) => ({ ...prev, [terminal]: height }));
      }
    }
    setEditingNotes((prev) => ({ ...prev, [terminal]: !prev[terminal] }));
  };

  const handleCancelEdit = (terminal: "T1" | "T2") => {
    // 원본 텍스트로 되돌리기
    setTerminalNotes((prev) => ({ ...prev, [terminal]: originalNotes[terminal] }));
    setEditingNotes((prev) => ({ ...prev, [terminal]: false }));
  };

  // T1, T2별 렌탈 필터링 함수 - useCallback으로 최적화
  const getRentalsByTerminal = useCallback(
    (rentals: RentalReservation[], terminal: "T1" | "T2") =>
      rentals.filter((rental) => rental.pickup_method === terminal),
    []
  );

  // 카테고리별 그룹화 함수 - useMemo로 최적화
  const groupRentalsByCategory = useCallback(
    (rentals: RentalReservation[]): CategoryGroup[] => {
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
    },
    []
  );

  // 카테고리 그룹 데이터 미리 계산
  const todayCategoryGroups = useMemo(() => {
    return groupRentalsByCategory(stats.todayRentals);
  }, [stats.todayRentals, groupRentalsByCategory]);

  const tomorrowCategoryGroups = useMemo(() => {
    return groupRentalsByCategory(stats.tomorrowRentals);
  }, [stats.tomorrowRentals, groupRentalsByCategory]);

  // 터미널별 데이터 미리 계산
  const terminalData = useMemo(() => {
    return {
      todayT1: getRentalsByTerminal(stats.todayRentals, "T1"),
      todayT2: getRentalsByTerminal(stats.todayRentals, "T2"),
      tomorrowT1: getRentalsByTerminal(stats.tomorrowRentals, "T1"),
      tomorrowT2: getRentalsByTerminal(stats.tomorrowRentals, "T2"),
    };
  }, [stats.todayRentals, stats.tomorrowRentals, getRentalsByTerminal]);

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
      <div className="space-y-4">
        {categoryGroups.map((group) => (
          <div
            key={group.category}
            className={`p-2 ${bgColorClass} border ${colorClass.replace(
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {group.count}건
                </Badge>
                {/* 우선순위 표시 - 오전 픽업이 있는 경우 */}
                {group.rentals.some((r) => r.pickup_time <= "12:00") && (
                  <Badge variant="destructive" className="text-xs">
                    오전
                  </Badge>
                )}
                {/* 수령 대기가 있는 경우 */}
                {group.rentals.some((r) => r.status === "pending") && (
                  <Badge variant="secondary" className="text-xs">
                    수령대기
                  </Badge>
                )}
              </div>
            </div>

            {/* 카테고리별 간단 요약 */}
            <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
              <div className="flex gap-4">
                <span>
                  수령전:{" "}
                  {group.rentals.filter((r) => r.status === "pending").length}건
                </span>
                <span>
                  수령완료:{" "}
                  {group.rentals.filter((r) => r.status === "picked_up").length}
                  건
                </span>
              </div>
              <div className="text-gray-500">
                {group.rentals.length > 0 && (
                  <>
                    {group.rentals[0].pickup_time.length > 5
                      ? group.rentals[0].pickup_time.slice(0, 5)
                      : group.rentals[0].pickup_time}{" "}
                    ~{" "}
                    {group.rentals[group.rentals.length - 1].pickup_time
                      .length > 5
                      ? group.rentals[
                          group.rentals.length - 1
                        ].pickup_time.slice(0, 5)
                      : group.rentals[group.rentals.length - 1].pickup_time}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {group.rentals.map((rental) => (
                <div
                  key={rental.id}
                  className="text-xs bg-white/90 rounded-lg p-2 shadow-sm border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-gray-900 flex items-center gap-1">
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

                  {/* 기본 정보 */}
                  <div className="space-y-1 mb-1">
                    <div className="flex items-center justify-between text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium">픽업시간:</span>
                        {rental.pickup_time.length > 5
                          ? rental.pickup_time.slice(0, 5)
                          : rental.pickup_time}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs w-24 truncate">
                          {rental.renter_phone}
                        </span>
                      </div>
                    </div>

                    {/* 반납 예정일 */}
                    {rental.return_date && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span className="font-medium">반납예정:</span>
                        {rental.return_date}{" "}
                        {rental.return_time && rental.return_time.length > 5
                          ? rental.return_time.slice(0, 5)
                          : rental.return_time}
                      </div>
                    )}
                  </div>

                  {/* 설명 */}
                  {rental.description && (
                    <div className="mt-1 p-1 bg-gray-50 rounded text-gray-600 italic text-xs">
                      <span className="font-medium">요청사항:</span>{" "}
                      {rental.description}
                    </div>
                  )}

                  {/* 추가 정보 */}
                  <div className="mt-1 pt-1 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs">
                      {/* 좌측: 옵션들 */}
                      <div className="flex items-center gap-2">
                        {rental.data_transmission && (
                          <Badge
                            variant="default"
                            className="text-xs bg-green-500"
                          >
                            데이터전송
                          </Badge>
                        )}
                        {rental.sd_option && (
                          <Badge variant="secondary" className="text-xs">
                            SD카드 {rental.sd_option}
                          </Badge>
                        )}
                      </div>

                      {/* 우측: 할당 기기 */}
                      <div className="flex items-center gap-1">
                        {rental.device_tag_name ? (
                          <>
                            <span className="text-gray-600">기기:</span>
                            <Badge
                              variant="outline"
                              className="text-xs font-mono font-bold border-blue-500 text-blue-700 bg-blue-50"
                            >
                              {rental.device_tag_name}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">미할당</span>
                        )}
                      </div>
                    </div>
                  </div>
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-2">
          <p className="text-gray-600">
            {format(new Date(), "yyyy년 MM월 dd일 EEEE", { locale: ko })}
          </p>
          <div className="flex items-center gap-4 mt-2 md:mt-0 text-sm">
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                오늘 출고: {stats.todayRentals.length}건
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                내일 출고: {stats.tomorrowRentals.length}건
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-4">
        {/* 오늘 출고 예정 - 카테고리별 */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-600">
                오늘 출고 예정
              </CardTitle>
              {todayCategoryGroups.some((g) => g.count === 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setShowZeroCategories((prev) => ({
                      ...prev,
                      today: !prev.today,
                    }))
                  }
                  className="text-xs p-1 h-auto"
                >
                  {showZeroCategories.today ? (
                    <>
                      <ChevronUp className="w-3 h-3 md:mr-1" />
                      <p className="hidden md:block">접기</p>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 md:mr-1" />
                      <p className="hidden md:block">전체보기</p>
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold mb-4">
              총 {stats.todayRentals.length}건
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-2 gap-y-1">
              {/* 카테고리 표시 - 접기/펼치기에 따라 필터링 */}
              {todayCategoryGroups
                .filter((group) => showZeroCategories.today || group.count > 0)
                .map((group) => (
                  <div
                    key={group.category}
                    className={`flex items-center justify-between border p-1 rounded-sm ${
                      group.count > 0
                        ? "border-2 border-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    <span
                      className={`text-sm truncate ${
                        group.count > 0 ? "text-blue-700" : "text-gray-400"
                      }`}
                    >
                      {group.categoryLabel}
                    </span>
                    <span
                      className={`text-sm font-mono ${
                        group.count > 0
                          ? "text-blue-600 font-bold"
                          : "text-gray-400"
                      }`}
                    >
                      {group.count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* 내일 출고 예정 - 카테고리별 */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-600">
                내일 출고 예정
              </CardTitle>
              {tomorrowCategoryGroups.some((g) => g.count === 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setShowZeroCategories((prev) => ({
                      ...prev,
                      tomorrow: !prev.tomorrow,
                    }))
                  }
                  className="text-xs p-1 h-auto"
                >
                  {showZeroCategories.tomorrow ? (
                    <>
                      <ChevronUp className="w-3 h-3 md:mr-1" />
                      <p className="hidden md:block">접기</p>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 md:mr-1" />
                      <p className="hidden md:block">전체보기</p>
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold mb-4">
              총 {stats.tomorrowRentals.length}건
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-2 gap-y-1">
              {/* 카테고리 표시 - 접기/펼치기에 따라 필터링 */}
              {tomorrowCategoryGroups
                .filter(
                  (group) => showZeroCategories.tomorrow || group.count > 0
                )
                .map((group) => (
                  <div
                    key={group.category}
                    className={`flex items-center justify-between border p-1 rounded-sm ${
                      group.count > 0
                        ? "border-2 border-orange-500"
                        : "border-gray-300"
                    }`}
                  >
                    <span
                      className={`text-sm truncate ${
                        group.count > 0 ? "text-orange-700" : "text-gray-400"
                      }`}
                    >
                      {group.categoryLabel}
                    </span>
                    <span
                      className={`text-sm font-mono ${
                        group.count > 0
                          ? "text-orange-600 font-bold"
                          : "text-gray-400"
                      }`}
                    >
                      {group.count}
                    </span>
                  </div>
                ))}
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
            <div className="text-xl md:text-2xl font-bold mb-2">
              {stats.todayStorage.length}건
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">T1 터미널</span>
                <Badge variant="outline" className="text-xs">
                  {
                    stats.todayStorage.filter(
                      (s) =>
                        (s as any).drop_off_location === "T1" ||
                        (s as any).pickup_location === "T1"
                    ).length
                  }
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">T2 터미널</span>
                <Badge variant="outline" className="text-xs">
                  {
                    stats.todayStorage.filter(
                      (s) =>
                        (s as any).drop_off_location === "T2" ||
                        (s as any).pickup_location === "T2"
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
            <div className="text-xl md:text-2xl font-bold mb-2">
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
              <div className="flex gap-2">
                {editingNotes.T1 ? (
                  <>
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelEdit("T1")}
                      disabled={savingNotes.T1}
                      className="text-xs px-2 py-1 md:px-3 md:py-2"
                    >
                      <X className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      취소
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditToggle("T1")}
                    className="text-xs px-2 py-1 md:px-3 md:py-2"
                  >
                    <Edit3 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    수정
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            {editingNotes.T1 ? (
              <Textarea
                placeholder="T1 터미널의 특이사항이나 중요한 공지사항을 입력하세요..."
                value={terminalNotes.T1}
                onChange={(e) => handleNotesChange("T1", e.target.value)}
                style={{ height: `${textareaHeights.T1}px` }}
                className="resize-none"
                autoFocus
              />
            ) : (
              <div
                ref={(el) => { divRefs.current.T1 = el; }}
                className="min-h-[120px] p-3 border border-input bg-background rounded-md text-sm whitespace-pre-wrap"
              >
                {terminalNotes.T1 || "특이사항이 없습니다."}
              </div>
            )}
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
              <div className="flex gap-2">
                {editingNotes.T2 ? (
                  <>
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelEdit("T2")}
                      disabled={savingNotes.T2}
                      className="text-xs px-2 py-1 md:px-3 md:py-2"
                    >
                      <X className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      취소
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditToggle("T2")}
                    className="text-xs px-2 py-1 md:px-3 md:py-2"
                  >
                    <Edit3 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    수정
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            {editingNotes.T2 ? (
              <Textarea
                placeholder="T2 터미널의 특이사항이나 중요한 공지사항을 입력하세요..."
                value={terminalNotes.T2}
                onChange={(e) => handleNotesChange("T2", e.target.value)}
                style={{ height: `${textareaHeights.T2}px` }}
                className="resize-none"
                autoFocus
              />
            ) : (
              <div
                ref={(el) => { divRefs.current.T2 = el; }}
                className="min-h-[120px] p-3 border border-input bg-background rounded-md text-sm whitespace-pre-wrap"
              >
                {terminalNotes.T2 || "특이사항이 없습니다."}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2">
              모든 직원이 공유 가능한 특이사항
            </div>
          </CardContent>
        </Card>
      </div>
      {/* 상세 예정 건수 */}
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
                  T1 터미널 ({terminalData.todayT1.length}건)
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
                  T2 터미널 ({terminalData.todayT2.length}건)
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
                  T1 터미널 ({terminalData.tomorrowT1.length}
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
                  T2 터미널 ({terminalData.tomorrowT2.length}
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
