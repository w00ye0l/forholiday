"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DEVICE_CATEGORY_LABELS, DEVICE_FEATURES } from "@/types/device";
import { PICKUP_METHOD_LABELS, RETURN_METHOD_LABELS } from "@/types/rental";

// 시간 옵션 생성 (24시간 형식)
const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2)
    .toString()
    .padStart(2, "0");
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

interface RentalData {
  id: string;
  renter_name: string;
  renter_phone: string;
  renter_email?: string | null;
  pickup_date: string;
  pickup_time: string;
  pickup_terminal: string;
  return_date: string;
  return_time: string;
  return_terminal: string;
  device_category: string;
  description?: string | null;
  sd_option?: string | null;
  data_transmission?: boolean;
}

interface RentalEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rental: RentalData | null;
  onSave: (rental: RentalData) => Promise<void>;
  isSaving?: boolean;
}

export function RentalEditDialog({
  isOpen,
  onOpenChange,
  rental,
  onSave,
  isSaving = false,
}: RentalEditDialogProps) {
  const [editingRental, setEditingRental] = React.useState<RentalData | null>(
    null
  );

  React.useEffect(() => {
    setEditingRental(rental);
  }, [rental]);

  const handleSave = async () => {
    if (!editingRental) return;
    await onSave(editingRental);
  };

  if (!editingRental) return null;

  // 기기 타입별 옵션 표시 여부 확인
  const isCameraDevice = DEVICE_FEATURES.CAMERA_CATEGORIES.includes(
    editingRental.device_category as any
  );
  const isPhoneDevice = DEVICE_FEATURES.PHONE_CATEGORIES.includes(
    editingRental.device_category as any
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-full overflow-auto">
        <DialogHeader>
          <DialogTitle>예약 상세 정보</DialogTitle>
          <DialogDescription>
            예약 정보를 수정하거나 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* 기본 정보 - 2컬럼 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">예약자명</label>
              <Input
                value={editingRental.renter_name}
                onChange={(e) => {
                  setEditingRental({
                    ...editingRental,
                    renter_name: e.target.value,
                  });
                }}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">연락처</label>
              <Input
                value={editingRental.renter_phone}
                onChange={(e) => {
                  setEditingRental({
                    ...editingRental,
                    renter_phone: e.target.value,
                  });
                }}
                className="text-sm"
              />
            </div>
          </div>

          {/* 기기 카테고리 - 1컬럼 */}
          <div>
            <label className="text-sm font-medium">기기 카테고리</label>
            <Select
              value={editingRental.device_category}
              onValueChange={(value) => {
                setEditingRental({
                  ...editingRental,
                  device_category: value,
                });
              }}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEVICE_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 이메일 - 1컬럼 */}
          <div>
            <label className="text-sm font-medium">이메일</label>
            <Input
              value={editingRental.renter_email || ""}
              onChange={(e) => {
                setEditingRental({
                  ...editingRental,
                  renter_email: e.target.value,
                });
              }}
              className="text-sm"
              placeholder="이메일 주소"
            />
          </div>

          {/* 수령 날짜/시간 - 2컬럼 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">수령 날짜</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm",
                      !editingRental.pickup_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingRental.pickup_date ? (
                      format(new Date(editingRental.pickup_date), "PPP", {
                        locale: ko,
                      })
                    ) : (
                      <span>수령 날짜를 선택하세요</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      editingRental.pickup_date
                        ? new Date(editingRental.pickup_date)
                        : undefined
                    }
                    onSelect={(date) => {
                      setEditingRental({
                        ...editingRental,
                        pickup_date: date ? format(date, "yyyy-MM-dd") : "",
                      });
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium">수령 시간</label>
              <Select
                value={
                  editingRental.pickup_time
                    ? editingRental.pickup_time.slice(0, 5)
                    : ""
                }
                onValueChange={(value) => {
                  setEditingRental({
                    ...editingRental,
                    pickup_time: value,
                  });
                }}
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
                    <SelectItem key={`pickup-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 반납 날짜/시간 - 2컬럼 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">반납 날짜</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm",
                      !editingRental.return_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingRental.return_date ? (
                      format(new Date(editingRental.return_date), "PPP", {
                        locale: ko,
                      })
                    ) : (
                      <span>반납 날짜를 선택하세요</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      editingRental.return_date
                        ? new Date(editingRental.return_date)
                        : undefined
                    }
                    onSelect={(date) => {
                      setEditingRental({
                        ...editingRental,
                        return_date: date ? format(date, "yyyy-MM-dd") : "",
                      });
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium">반납 시간</label>
              <Select
                value={
                  editingRental.return_time
                    ? editingRental.return_time.slice(0, 5)
                    : ""
                }
                onValueChange={(value) => {
                  setEditingRental({
                    ...editingRental,
                    return_time: value,
                  });
                }}
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
                    <SelectItem key={`return-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 수령/반납 장소 - 2컬럼 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">수령 장소</label>
              <Select
                value={editingRental.pickup_terminal}
                onValueChange={(value) => {
                  setEditingRental({
                    ...editingRental,
                    pickup_terminal: value,
                  });
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PICKUP_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">반납 장소</label>
              <Select
                value={editingRental.return_terminal}
                onValueChange={(value) => {
                  setEditingRental({
                    ...editingRental,
                    return_terminal: value,
                  });
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RETURN_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 기기별 옵션 - 카메라: SD 카드, 폰: 데이터 전송 */}
          {(isCameraDevice || isPhoneDevice) && (
            <div className="grid grid-cols-1 gap-4">
              {/* SD 카드 옵션 - 카메라 기기만 */}
              {isCameraDevice && (
                <div>
                  <label className="text-sm font-medium">SD 카드 옵션</label>
                  <Select
                    value={editingRental.sd_option || "none"}
                    onValueChange={(value) => {
                      setEditingRental({
                        ...editingRental,
                        sd_option: value === "none" ? null : value,
                      });
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="SD 카드 옵션 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      <SelectItem value="대여">대여</SelectItem>
                      <SelectItem value="구매">구매</SelectItem>
                      <SelectItem value="구매+대여">구매+대여</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* 데이터 전송 - 폰 기기만 */}
              {isPhoneDevice && (
                <div>
                  <label className="text-sm font-medium">데이터 전송</label>
                  <Select
                    value={editingRental.data_transmission ? "true" : "false"}
                    onValueChange={(value) => {
                      setEditingRental({
                        ...editingRental,
                        data_transmission: value === "true",
                      });
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">사용 안함</SelectItem>
                      <SelectItem value="true">사용함</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* 비고 - 1컬럼 */}
          <div>
            <label className="text-sm font-medium">비고</label>
            <Input
              value={editingRental.description || ""}
              onChange={(e) => {
                setEditingRental({
                  ...editingRental,
                  description: e.target.value,
                });
              }}
              className="text-sm"
              placeholder="비고 사항을 입력하세요"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
