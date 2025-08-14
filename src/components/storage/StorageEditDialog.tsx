"use client";

import { useState, useEffect } from "react";
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
import {
  StorageReservation,
  STORAGE_LOCATION_LABELS,
  RESERVATION_SITE_LABELS,
  RESERVATION_SITES,
} from "@/types/storage";

// 시간 옵션 생성 (24시간 형식)
const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2)
    .toString()
    .padStart(2, "0");
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

interface StorageEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  storage: StorageReservation | null;
  onSave: (storage: StorageReservation) => Promise<void>;
  isSaving?: boolean;
}

export function StorageEditDialog({
  isOpen,
  onOpenChange,
  storage,
  onSave,
  isSaving = false,
}: StorageEditDialogProps) {
  const [editingStorage, setEditingStorage] =
    useState<StorageReservation | null>(null);

  useEffect(() => {
    setEditingStorage(storage);
  }, [storage]);

  const handleSave = async () => {
    if (!editingStorage) return;
    await onSave(editingStorage);
  };

  if (!editingStorage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-full overflow-auto">
        <DialogHeader>
          <DialogTitle>짐보관 예약 상세 정보</DialogTitle>
          <DialogDescription>
            짐보관 예약 정보를 수정하거나 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* 기본 정보 - 2컬럼 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">고객명</label>
              <Input
                value={editingStorage.customer_name}
                onChange={(e) => {
                  setEditingStorage({
                    ...editingStorage,
                    customer_name: e.target.value,
                  });
                }}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">연락처</label>
              <Input
                value={editingStorage.phone_number}
                onChange={(e) => {
                  setEditingStorage({
                    ...editingStorage,
                    phone_number: e.target.value,
                  });
                }}
                className="text-sm"
              />
            </div>
          </div>

          {/* 이메일 - 1컬럼 */}
          <div>
            <label className="text-sm font-medium">이메일</label>
            <Input
              value={editingStorage.customer_email || ""}
              onChange={(e) => {
                setEditingStorage({
                  ...editingStorage,
                  customer_email: e.target.value,
                });
              }}
              className="text-sm"
              placeholder="이메일 주소"
            />
          </div>

          {/* 물품 정보 - 2컬럼 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">물품 설명</label>
              <Input
                value={editingStorage.items_description}
                onChange={(e) => {
                  setEditingStorage({
                    ...editingStorage,
                    items_description: e.target.value,
                  });
                }}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">수량</label>
              <Input
                type="number"
                value={editingStorage.quantity}
                onChange={(e) => {
                  setEditingStorage({
                    ...editingStorage,
                    quantity: parseInt(e.target.value) || 1,
                  });
                }}
                className="text-sm"
                min="1"
              />
            </div>
          </div>

          {/* 태그 번호 - 1컬럼 */}
          <div>
            <label className="text-sm font-medium">태그 번호</label>
            <Input
              value={editingStorage.tag_number || ""}
              onChange={(e) => {
                setEditingStorage({
                  ...editingStorage,
                  tag_number: e.target.value,
                });
              }}
              className="text-sm"
              placeholder="태그 번호를 입력하세요"
            />
          </div>

          {/* 맡기는 날짜/시간/장소 - 3컬럼 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">맡기는 날짜</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !editingStorage.drop_off_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingStorage.drop_off_date ? (
                        format(new Date(editingStorage.drop_off_date), "PPP", {
                          locale: ko,
                        })
                      ) : (
                        <span>날짜를 선택하세요</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        editingStorage.drop_off_date
                          ? new Date(editingStorage.drop_off_date)
                          : undefined
                      }
                      onSelect={(date) => {
                        setEditingStorage({
                          ...editingStorage,
                          drop_off_date: date ? format(date, "yyyy-MM-dd") : "",
                        });
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">맡기는 시간</label>
                <Select
                  value={
                    editingStorage.drop_off_time
                      ? editingStorage.drop_off_time.slice(0, 5)
                      : ""
                  }
                  onValueChange={(value) => {
                    setEditingStorage({
                      ...editingStorage,
                      drop_off_time: value,
                    });
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="시간을 선택하세요">
                      {editingStorage.drop_off_time
                        ? editingStorage.drop_off_time.slice(0, 5)
                        : "시간을 선택하세요"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`drop-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">맡기는 장소</label>
              <Select
                value={editingStorage.drop_off_location}
                onValueChange={(value: any) => {
                  setEditingStorage({
                    ...editingStorage,
                    drop_off_location: value,
                  });
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STORAGE_LOCATION_LABELS).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 찾는 날짜/시간/장소 - 3컬럼 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">찾는 날짜</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !editingStorage.pickup_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingStorage.pickup_date ? (
                        format(new Date(editingStorage.pickup_date), "PPP", {
                          locale: ko,
                        })
                      ) : (
                        <span>날짜를 선택하세요</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        editingStorage.pickup_date
                          ? new Date(editingStorage.pickup_date)
                          : undefined
                      }
                      onSelect={(date) => {
                        setEditingStorage({
                          ...editingStorage,
                          pickup_date: date ? format(date, "yyyy-MM-dd") : "",
                        });
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">찾는 시간</label>
                <Select
                  value={
                    editingStorage.pickup_time
                      ? editingStorage.pickup_time.slice(0, 5)
                      : ""
                  }
                  onValueChange={(value) => {
                    setEditingStorage({
                      ...editingStorage,
                      pickup_time: value,
                    });
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="시간을 선택하세요">
                      {editingStorage.pickup_time
                        ? editingStorage.pickup_time.slice(0, 5)
                        : "시간을 선택하세요"}
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
            <div>
              <label className="text-sm font-medium">찾는 장소</label>
              <Select
                value={editingStorage.pickup_location}
                onValueChange={(value: any) => {
                  setEditingStorage({
                    ...editingStorage,
                    pickup_location: value,
                  });
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STORAGE_LOCATION_LABELS).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 예약 사이트 - 1컬럼 */}
          <div>
            <label className="text-sm font-medium">예약 사이트</label>
            <Select
              value={editingStorage.reservation_site}
              onValueChange={(value) => {
                setEditingStorage({
                  ...editingStorage,
                  reservation_site: value,
                });
              }}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESERVATION_SITES.map((site) => (
                  <SelectItem key={site} value={site}>
                    {RESERVATION_SITE_LABELS[site]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 메모 - 1컬럼 */}
          <div>
            <label className="text-sm font-medium">메모</label>
            <Input
              value={editingStorage.notes || ""}
              onChange={(e) => {
                setEditingStorage({
                  ...editingStorage,
                  notes: e.target.value,
                });
              }}
              className="text-sm"
              placeholder="메모 사항을 입력하세요"
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