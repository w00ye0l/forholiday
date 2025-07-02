"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  RentalReservation,
  ReservationStatus,
  STATUS_MAP,
  RETURN_METHOD_LABELS,
  CARD_BORDER_COLORS,
} from "@/types/rental";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  CalendarIcon,
  PencilIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircle,
} from "lucide-react";

interface ReturnListProps {
  rentals: RentalReservation[];
  onStatusUpdate?: () => void;
}

export function ReturnList({
  rentals: initialRentals,
  onStatusUpdate,
}: ReturnListProps) {
  const [rentals, setRentals] = useState(initialRentals);
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const supabase = createClient();

  // 상태별 카드 스타일 반환
  const getCardStyle = (status: ReservationStatus) => {
    const baseClasses = "p-3 shadow-sm border-l-4";

    switch (status) {
      case "pending":
        // 수령전 - 하얀색/무색
        return `${baseClasses} bg-white border-l-gray-400`;
      case "picked_up":
        // 수령완료 - 파란색
        return `${baseClasses} bg-blue-50 border-l-blue-500`;
      case "not_picked_up":
        // 미수령 - 취소선, 배경색 무색
        return `${baseClasses} bg-white border-l-red-500 line-through opacity-70`;
      case "returned":
        // 반납완료 - 초록색
        return `${baseClasses} bg-green-50 border-l-green-500`;
      case "overdue":
        // 미반납 - 노란색 (향후 구현)
        return `${baseClasses} bg-yellow-50 border-l-yellow-500`;
      case "problem":
        // 문제있음 - 빨간색 (향후 구현)
        return `${baseClasses} bg-red-50 border-l-red-500`;
      default:
        // 알 수 없는 상태는 기본 스타일
        return `${baseClasses} bg-white border-l-gray-400`;
    }
  };

  // props가 변경될 때 내부 상태 업데이트
  useEffect(() => {
    setRentals(initialRentals);
  }, [initialRentals]);

  const handleStatusChange = async (
    id: string,
    newStatus: ReservationStatus
  ) => {
    try {
      setIsUpdating((prev) => ({ ...prev, [id]: true }));

      const { error } = await supabase
        .from("rental_reservations")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setRentals((prev) =>
        prev.map((rental) =>
          rental.id === id ? { ...rental, status: newStatus } : rental
        )
      );

      toast.success("상태가 업데이트되었습니다.");
      onStatusUpdate?.();
    } catch (error) {
      console.error("상태 업데이트 실패:", error);
      toast.error("상태 업데이트에 실패했습니다.");
    } finally {
      setIsUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleNotesUpdate = async (id: string) => {
    try {
      const noteText = notes[id] || "";

      const { error } = await supabase
        .from("rental_reservations")
        .update({ description: noteText })
        .eq("id", id);

      if (error) throw error;

      setRentals((prev) =>
        prev.map((rental) =>
          rental.id === id ? { ...rental, description: noteText } : rental
        )
      );

      setEditingNotes((prev) => ({ ...prev, [id]: false }));
      toast.success("비고가 업데이트되었습니다.");
    } catch (error) {
      console.error("비고 업데이트 실패:", error);
      toast.error("비고 업데이트에 실패했습니다.");
    }
  };

  // 반납 완료 처리 함수
  const handleCompleteReturn = async (id: string) => {
    const rental = rentals.find((r) => r.id === id);
    if (!rental) return;

    // 확인 단계 추가
    const confirmed = window.confirm(
      `${rental.renter_name}님의 ${
        rental.device_tag_name || rental.device_category
      } 기기 반납을 완료 처리하시겠습니까?\n\n처리 후에는 상태가 '반납완료'로 변경됩니다.`
    );

    if (!confirmed) return;

    try {
      setIsUpdating((prev) => ({ ...prev, [id]: true }));

      // 상태를 returned로 변경
      const { error } = await supabase
        .from("rental_reservations")
        .update({
          status: "returned",
        })
        .eq("id", id);

      if (error) throw error;

      setRentals((prev) =>
        prev.map((rental) =>
          rental.id === id
            ? {
                ...rental,
                status: "returned" as ReservationStatus,
              }
            : rental
        )
      );

      toast.success("반납 완료 처리되었습니다.");
      onStatusUpdate?.();
    } catch (error) {
      console.error("반납 완료 처리 실패:", error);
      toast.error("반납 완료 처리에 실패했습니다.");
    } finally {
      setIsUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const startEditingNotes = (id: string, currentDescription?: string) => {
    setEditingNotes((prev) => ({ ...prev, [id]: true }));
    setNotes((prev) => ({ ...prev, [id]: currentDescription || "" }));
  };

  return (
    <div className="grid gap-2 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rentals.map((rental) => (
        <Card key={rental.id} className={getCardStyle(rental.status)}>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2 justify-between">
              {/* 메인 정보 (이름, 연락처, 시간) */}
              <div className="flex flex-col justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">
                    {rental.renter_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-3 h-3" />
                  <span className="text-xs text-gray-600">
                    {rental.renter_phone}
                  </span>
                </div>
                <div className="text-xs text-gray-600 flex gap-2 items-center">
                  <MapPinIcon className="w-3 h-3" />
                  <span>{RETURN_METHOD_LABELS[rental.return_method]}</span>
                </div>
                <div className="text-xs text-gray-600 flex gap-2 items-center">
                  <CalendarIcon className="w-3 h-3" />
                  <span>
                    반납:{" "}
                    {format(new Date(rental.return_date), "yyyy.MM.dd", {
                      locale: ko,
                    })}{" "}
                    {rental.return_time.slice(0, 5)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 text-sm">
                {/* 기기 정보 표시 */}
                <div className="w-36">
                  <div className="text-sm font-mono bg-white px-2 py-1 rounded border text-center">
                    {rental.device_tag_name || rental.device_category}
                  </div>
                </div>

                {/* 반납 완료 버튼 (picked_up 상태인 경우에만 표시) */}
                {rental.status === "picked_up" && (
                  <Button
                    size="sm"
                    onClick={() => handleCompleteReturn(rental.id)}
                    disabled={isUpdating[rental.id]}
                    className="h-7 w-36 text-xs bg-green-600 hover:bg-green-700"
                  >
                    {isUpdating[rental.id] ? "처리중..." : "반납 완료"}
                  </Button>
                )}

                {/* 반납 완료 표시 */}
                {rental.status === "returned" && (
                  <div className="w-36">
                    <Badge className="w-full justify-center text-xs bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      반납완료
                    </Badge>
                  </div>
                )}

                {/* 상태 수동 변경 (개발자/관리자용) */}
                <div className="w-24">
                  <Select
                    value={rental.status}
                    onValueChange={(value: ReservationStatus) =>
                      handleStatusChange(rental.id, value)
                    }
                    disabled={isUpdating[rental.id]}
                  >
                    <SelectTrigger className="h-6 text-xs bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_MAP).map(
                        ([status, statusInfo]) => (
                          <SelectItem key={status} value={status}>
                            {statusInfo.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SD 카드, 데이터 전송 옵션 */}
            <div>
              {rental.sd_option && (
                <Badge variant="secondary" className="border-gray-400">
                  SD카드 {rental.sd_option}
                </Badge>
              )}
              {rental.data_transmission && (
                <Badge variant="secondary" className="border-gray-400">
                  데이터 전송
                </Badge>
              )}
            </div>

            {/* 비고 및 로딩 */}
            <div className="flex items-center gap-1">
              {editingNotes[rental.id] ? (
                <>
                  <Input
                    value={notes[rental.id] || ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [rental.id]: e.target.value,
                      }))
                    }
                    placeholder="비고"
                    className="h-7 text-sm flex-1 min-w-0 bg-white border-gray-400"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleNotesUpdate(rental.id)}
                    className="h-7 w-7 p-0 text-xs flex-shrink-0"
                  >
                    ✓
                  </Button>
                </>
              ) : (
                <>
                  <p
                    className="text-sm text-gray-600 break-all min-w-0"
                    title={rental.description || "비고 없음"}
                  >
                    비고: {rental.description || "비고 없음"}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      startEditingNotes(rental.id, rental.description)
                    }
                    className="h-7 w-7 p-0 text-xs flex-shrink-0"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </Button>
                </>
              )}

              {isUpdating[rental.id] && (
                <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full ml-1 flex-shrink-0"></div>
              )}
            </div>
          </div>
        </Card>
      ))}

      {rentals.length === 0 && (
        <div className="col-span-full text-center py-6 text-gray-500 text-sm">
          반납할 예약이 없습니다.
        </div>
      )}
    </div>
  );
}
