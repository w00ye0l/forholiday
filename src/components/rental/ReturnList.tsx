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
  EditIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Device,
  DEVICE_CATEGORY_LABELS,
  DEVICE_FEATURES,
} from "@/types/device";

interface ReturnListProps {
  rentals: RentalReservation[];
  onStatusUpdate?: () => void;
  getDisplayStatus: (rental: RentalReservation) => ReservationStatus;
}

export function ReturnList({
  rentals: initialRentals,
  onStatusUpdate,
  getDisplayStatus,
}: ReturnListProps) {
  const [rentals, setRentals] = useState(initialRentals);
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [editingRental, setEditingRental] = useState<RentalReservation | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 30분 단위 시간 옵션 생성
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

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

  const startEditingNotes = (id: string, currentDescription?: string) => {
    setEditingNotes((prev) => ({ ...prev, [id]: true }));
    setNotes((prev) => ({ ...prev, [id]: currentDescription || "" }));
  };

  return (
    <div className="grid gap-2 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rentals.map((rental) => (
        <Card
          key={rental.id}
          className={getCardStyle(getDisplayStatus(rental))}
        >
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2 justify-between">
              {/* 메인 정보 (이름, 연락처, 시간) */}
              <div className="flex flex-col justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm md:text-base">
                    {rental.renter_name}
                  </span>
                  <Badge
                    variant="outline"
                    className={`
                      ${
                        getDisplayStatus(rental) === "picked_up"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : ""
                      }
                      ${
                        getDisplayStatus(rental) === "not_picked_up"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : ""
                      }
                      ${
                        getDisplayStatus(rental) === "returned"
                          ? "bg-green-100 text-green-800 border-green-300"
                          : ""
                      }
                      ${
                        getDisplayStatus(rental) === "overdue"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : ""
                      }
                      ${
                        getDisplayStatus(rental) === "problem"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : ""
                      }
                    `}
                  >
                    {getDisplayStatus(rental) === "picked_up" && "수령완료"}
                    {getDisplayStatus(rental) === "not_picked_up" && "미수령"}
                    {getDisplayStatus(rental) === "returned" && "반납완료"}
                    {getDisplayStatus(rental) === "overdue" && "지연 반납"}
                    {getDisplayStatus(rental) === "problem" && "문제있음"}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 flex gap-2 items-center">
                  <CalendarIcon className="w-3 h-3" />
                  <span>
                    {format(new Date(rental.return_date), "yyyy.MM.dd", {
                      locale: ko,
                    })}{" "}
                    {rental.return_time.slice(0, 5)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 flex gap-2 items-center">
                  <MapPinIcon className="w-3 h-3" />
                  <span>{RETURN_METHOD_LABELS[rental.return_method]}</span>
                </div>
                <div className="text-xs text-gray-600 flex gap-2 items-center">
                  <PhoneIcon className="min-w-3 min-h-3 w-3 h-3" />
                  <span className="text-xs text-gray-600 break-all">
                    {rental.renter_phone}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 text-sm">
                {/* 수정 버튼 */}
                <div className="w-36 flex justify-end">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingRental(rental);
                          setIsDialogOpen(true);
                        }}
                      >
                        <EditIcon className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>예약 상세 정보</DialogTitle>
                      </DialogHeader>
                      {editingRental && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">
                                예약자명
                              </label>
                              <Input
                                value={editingRental.renter_name}
                                onChange={(e) =>
                                  setEditingRental({
                                    ...editingRental,
                                    renter_name: e.target.value,
                                  })
                                }
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                연락처
                              </label>
                              <Input
                                value={editingRental.renter_phone}
                                onChange={(e) =>
                                  setEditingRental({
                                    ...editingRental,
                                    renter_phone: e.target.value,
                                  })
                                }
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                수령 날짜
                              </label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal text-sm",
                                      !editingRental.pickup_date &&
                                        "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {editingRental.pickup_date ? (
                                      format(
                                        new Date(editingRental.pickup_date),
                                        "PPP",
                                        { locale: ko }
                                      )
                                    ) : (
                                      <span>수령 날짜를 선택하세요</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={
                                      editingRental.pickup_date
                                        ? new Date(editingRental.pickup_date)
                                        : undefined
                                    }
                                    onSelect={(date) =>
                                      setEditingRental({
                                        ...editingRental,
                                        pickup_date: date
                                          ? format(date, "yyyy-MM-dd")
                                          : "",
                                      })
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                수령 시간
                              </label>
                              <Select
                                value={
                                  editingRental.pickup_time
                                    ? editingRental.pickup_time.slice(0, 5)
                                    : ""
                                }
                                onValueChange={(value) =>
                                  setEditingRental({
                                    ...editingRental,
                                    pickup_time: value,
                                  })
                                }
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="수령 시간을 선택하세요">
                                    {editingRental.pickup_time
                                      ? editingRental.pickup_time.slice(0, 5)
                                      : "수령 시간을 선택하세요"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map((time) => (
                                    <SelectItem
                                      key={`pickup-${time}`}
                                      value={time}
                                    >
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                반납 날짜
                              </label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal text-sm",
                                      !editingRental.return_date &&
                                        "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {editingRental.return_date ? (
                                      format(
                                        new Date(editingRental.return_date),
                                        "PPP",
                                        { locale: ko }
                                      )
                                    ) : (
                                      <span>반납 날짜를 선택하세요</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={
                                      editingRental.return_date
                                        ? new Date(editingRental.return_date)
                                        : undefined
                                    }
                                    onSelect={(date) =>
                                      setEditingRental({
                                        ...editingRental,
                                        return_date: date
                                          ? format(date, "yyyy-MM-dd")
                                          : "",
                                      })
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                반납 시간
                              </label>
                              <Select
                                value={
                                  editingRental.return_time
                                    ? editingRental.return_time.slice(0, 5)
                                    : ""
                                }
                                onValueChange={(value) =>
                                  setEditingRental({
                                    ...editingRental,
                                    return_time: value,
                                  })
                                }
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="반납 시간을 선택하세요">
                                    {editingRental.return_time
                                      ? editingRental.return_time.slice(0, 5)
                                      : "반납 시간을 선택하세요"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map((time) => (
                                    <SelectItem
                                      key={`return-${time}`}
                                      value={time}
                                    >
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* 데이터 전송 및 SD 카드 옵션 - 기기 카테고리에 따라 조건부 렌더링 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 데이터 전송 옵션 (핸드폰 기종일 경우만) */}
                            {DEVICE_FEATURES.PHONE_CATEGORIES.includes(
                              editingRental.device_category
                            ) && (
                              <div>
                                <label className="text-sm font-medium">
                                  데이터 전송
                                </label>
                                <Select
                                  value={
                                    editingRental.data_transmission
                                      ? "true"
                                      : "false"
                                  }
                                  onValueChange={(value) =>
                                    setEditingRental({
                                      ...editingRental,
                                      data_transmission: value === "true",
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">예</SelectItem>
                                    <SelectItem value="false">
                                      아니오
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* SD 카드 옵션 (카메라 기종일 경우만) */}
                            {DEVICE_FEATURES.CAMERA_CATEGORIES.includes(
                              editingRental.device_category
                            ) && (
                              <div>
                                <label className="text-sm font-medium">
                                  SD 카드 옵션
                                </label>
                                <Select
                                  value={editingRental.sd_option || "none"}
                                  onValueChange={(value) =>
                                    setEditingRental({
                                      ...editingRental,
                                      sd_option:
                                        value === "none"
                                          ? undefined
                                          : (value as
                                              | "대여"
                                              | "구매"
                                              | "구매+대여"),
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="선택하세요" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">없음</SelectItem>
                                    <SelectItem value="대여">대여</SelectItem>
                                    <SelectItem value="구매">구매</SelectItem>
                                    <SelectItem value="구매+대여">
                                      구매+대여
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-medium">비고</label>
                            <Input
                              value={editingRental.description || ""}
                              onChange={(e) =>
                                setEditingRental({
                                  ...editingRental,
                                  description: e.target.value,
                                })
                              }
                              className="text-sm"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <DialogClose asChild>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingRental(null);
                                  setIsDialogOpen(false);
                                }}
                              >
                                취소
                              </Button>
                            </DialogClose>
                            <Button
                              onClick={async () => {
                                try {
                                  const originalRental = rentals.find(
                                    (r) => r.id === editingRental.id
                                  );
                                  const dataTransmissionChanged =
                                    originalRental?.data_transmission !==
                                    editingRental.data_transmission;

                                  // 예약 정보 업데이트
                                  const { error } = await supabase
                                    .from("rental_reservations")
                                    .update({
                                      renter_name: editingRental.renter_name,
                                      renter_phone: editingRental.renter_phone,
                                      pickup_date: editingRental.pickup_date,
                                      pickup_time: editingRental.pickup_time,
                                      return_date: editingRental.return_date,
                                      return_time: editingRental.return_time,
                                      data_transmission:
                                        editingRental.data_transmission,
                                      sd_option:
                                        editingRental.sd_option || null,
                                      description: editingRental.description,
                                    })
                                    .eq("id", editingRental.id);

                                  if (error) throw error;

                                  // 데이터 전송 옵션이 변경된 경우 data_transfers 테이블 처리
                                  if (dataTransmissionChanged) {
                                    if (editingRental.data_transmission) {
                                      // 데이터 전송이 활성화된 경우 - 기존 레코드 확인 후 생성
                                      const { data: existingTransfer } =
                                        await supabase
                                          .from("data_transfers")
                                          .select("id")
                                          .eq("rental_id", editingRental.id)
                                          .single();

                                      if (!existingTransfer) {
                                        const { error: insertError } =
                                          await supabase
                                            .from("data_transfers")
                                            .insert({
                                              rental_id: editingRental.id,
                                              status: "PENDING_UPLOAD",
                                            });

                                        if (insertError) {
                                          console.error(
                                            "데이터 전송 레코드 생성 실패:",
                                            insertError
                                          );
                                          throw insertError;
                                        }
                                      }
                                    } else {
                                      // 데이터 전송이 비활성화된 경우 - data_transfers 레코드 삭제
                                      const { error: deleteError } =
                                        await supabase
                                          .from("data_transfers")
                                          .delete()
                                          .eq("rental_id", editingRental.id);

                                      if (deleteError) {
                                        console.error(
                                          "데이터 전송 레코드 삭제 실패:",
                                          deleteError
                                        );
                                        // 삭제 실패 시 경고만 출력하고 계속 진행
                                      }
                                    }
                                  }

                                  toast.success("예약 정보가 수정되었습니다.");
                                  setEditingRental(null);
                                  setIsDialogOpen(false);
                                  onStatusUpdate?.();
                                } catch (error) {
                                  console.error("예약 수정 실패:", error);
                                  toast.error("예약 수정에 실패했습니다.");
                                }
                              }}
                            >
                              저장
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
                {/* 기기 정보 표시 */}
                <div className="w-36">
                  <div
                    className={`text-sm font-mono px-2 py-1 rounded-md border text-center ${
                      rental.device_tag_name
                        ? "bg-device-assigned text-white"
                        : "bg-white text-gray-800"
                    }`}
                  >
                    {rental.device_tag_name || rental.device_category}
                  </div>
                </div>

                {/* 상태 수동 변경 (개발자/관리자용) */}
                <div className="w-24">
                  <Select
                    value={getDisplayStatus(rental)}
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
                    title={rental.description || ""}
                  >
                    비고: {rental.description || ""}
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
