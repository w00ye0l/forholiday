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
import { RentalReservation, ReservationStatus } from "@/types/rental";
import { Device, DEVICE_CATEGORY_LABELS } from "@/types/device";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, PencilIcon, PhoneIcon } from "lucide-react";

interface OutgoingListProps {
  rentals: RentalReservation[];
  devices: Device[];
}

// 상태 라벨 매핑
const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "수령전",
  picked_up: "수령완료",
  not_picked_up: "미수령",
};

// 상태별 색상 매핑 (배지용)
const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: "bg-gray-50 text-gray-800",
  picked_up: "bg-blue-100 text-blue-800",
  not_picked_up: "bg-red-100 text-red-800",
};

// 상태별 카드 배경 색상
const CARD_BORDER_COLORS: Record<ReservationStatus, string> = {
  pending: "border-gray-200",
  picked_up: "border-blue-400",
  not_picked_up: "border-red-400",
};

export function OutgoingList({
  rentals: initialRentals,
  devices,
}: OutgoingListProps) {
  const [rentals, setRentals] = useState(initialRentals);
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedDevices, setSelectedDevices] = useState<
    Record<string, string>
  >({});
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const supabase = createClient();

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

  const handleDeviceSelect = async (id: string, selectedTagName: string) => {
    if (!selectedTagName) return;

    try {
      setIsUpdating((prev) => ({ ...prev, [id]: true }));

      const { error } = await supabase
        .from("rental_reservations")
        .update({
          status: "picked_up",
          device_tag_name: selectedTagName,
        })
        .eq("id", id);

      if (error) throw error;

      setRentals((prev) =>
        prev.map((rental) =>
          rental.id === id
            ? {
                ...rental,
                status: "picked_up" as ReservationStatus,
                device_tag_name: selectedTagName,
              }
            : rental
        )
      );

      setSelectedDevices((prev) => ({ ...prev, [id]: "" }));
      toast.success("수령 완료 처리되었습니다.");
    } catch (error) {
      console.error("수령 완료 처리 실패:", error);
      toast.error("수령 완료 처리에 실패했습니다.");
    } finally {
      setIsUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const startEditingNotes = (id: string, currentDescription?: string) => {
    setEditingNotes((prev) => ({ ...prev, [id]: true }));
    setNotes((prev) => ({ ...prev, [id]: currentDescription || "" }));
  };

  return (
    <div className="space-y-1 sm:space-y-3">
      {rentals.map((rental) => (
        <Card
          key={rental.id}
          className={`border-2 ${CARD_BORDER_COLORS[rental.status]} ${
            STATUS_COLORS[rental.status]
          } p-3`}
        >
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2 justify-between">
              {/* 메인 정보 (이름, 연락처, 시간) */}
              <div className="flex flex-col justify-between">
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
                  <CalendarIcon className="w-3 h-3" />
                  <span>
                    {format(new Date(rental.pickup_date), "yyyy.MM.dd", {
                      locale: ko,
                    })}{" "}
                    {rental.pickup_time.slice(0, 5)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 text-sm">
                {/* 기기 선택/표시 */}
                <div className="w-36">
                  {rental.status === "pending" ? (
                    <Select
                      value={selectedDevices[rental.id] || ""}
                      onValueChange={(value) =>
                        handleDeviceSelect(rental.id, value)
                      }
                      disabled={isUpdating[rental.id]}
                    >
                      <SelectTrigger className="h-7 text-sm bg-white border-gray-400">
                        <SelectValue
                          placeholder={`${
                            DEVICE_CATEGORY_LABELS[rental.device_category]
                          } 선택`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {devices
                          .filter(
                            (device) =>
                              device.category === rental.device_category
                          )
                          .map((device) => (
                            <SelectItem
                              key={device.tag_name}
                              value={device.tag_name}
                            >
                              {device.tag_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm font-mono bg-white px-2 py-1 rounded border text-center">
                      {rental.device_tag_name || rental.device_category}
                    </div>
                  )}
                </div>

                {/* 상태 관리 */}
                <div className="w-24">
                  <Select
                    value={rental.status}
                    onValueChange={(value: ReservationStatus) =>
                      handleStatusChange(rental.id, value)
                    }
                    disabled={isUpdating[rental.id]}
                  >
                    <SelectTrigger className="h-7 text-sm bg-white border-gray-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">수령전</SelectItem>
                      <SelectItem value="picked_up">수령완료</SelectItem>
                      <SelectItem value="not_picked_up">미수령</SelectItem>
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
                    className="h-7 text-xs w-fit"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleNotesUpdate(rental.id)}
                    className="h-7 w-7 p-0 text-xs"
                  >
                    ✓
                  </Button>
                </>
              ) : (
                <>
                  <div
                    className="text-sm text-gray-600 truncate w-fit"
                    title={rental.description || "비고 없음"}
                  >
                    비고: {rental.description || "비고 없음"}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      startEditingNotes(rental.id, rental.description)
                    }
                    className="h-7 w-7 p-0 text-xs"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </Button>
                </>
              )}

              {isUpdating[rental.id] && (
                <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full ml-1"></div>
              )}
            </div>
          </div>
        </Card>
      ))}

      {rentals.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          출고할 예약이 없습니다.
        </div>
      )}
    </div>
  );
}
