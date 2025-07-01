"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CheckCircle,
  Package,
  Clock,
  User,
  Phone,
  Calendar as CalendarIcon,
  Hash,
  FileText,
  Tag,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StorageReservation, STORAGE_STATUS_LABELS } from "@/types/storage";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface StorageLogisticsListProps {
  storages: StorageReservation[];
  type: "drop-off" | "pick-up";
  onStatusUpdate?: () => void;
}

interface EditingState {
  [storageId: string]: {
    isEditing: boolean;
  };
}

export default function StorageLogisticsList({
  storages,
  type,
  onStatusUpdate,
}: StorageLogisticsListProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [editingState, setEditingState] = useState<EditingState>({});
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const supabase = createClient();

  // 전체 편집 모드 토글
  const toggleEditMode = (storageId: string) => {
    setEditingState((prev) => ({
      ...prev,
      [storageId]: {
        isEditing: !prev[storageId]?.isEditing,
      },
    }));

    // 편집 모드 진입 시 현재 값들을 editValues에 설정
    if (!editingState[storageId]?.isEditing) {
      const storage = storages.find((s) => s.id === storageId);
      if (storage) {
        setEditValues((prev) => ({
          ...prev,
          [`${storageId}_customerName`]: storage.customer_name,
          [`${storageId}_phoneNumber`]: storage.phone_number,
          [`${storageId}_itemsDescription`]: storage.items_description,
          [`${storageId}_quantity`]: storage.quantity,
          [`${storageId}_tagNumber`]: storage.tag_number || "",
          [`${storageId}_status`]: storage.status,
          [`${storageId}_notes`]: storage.notes || "",
          [`${storageId}_dropOffDate`]: storage.drop_off_date,
          [`${storageId}_dropOffTime`]: storage.drop_off_time,
          [`${storageId}_pickupDate`]: storage.pickup_date,
          [`${storageId}_pickupTime`]: storage.pickup_time,
        }));
      }
    }
  };

  // 편집 값 변경
  const handleEditChange = (storageId: string, field: string, value: any) => {
    setEditValues((prev) => ({
      ...prev,
      [`${storageId}_${field}`]: value,
    }));
  };

  // 전체 필드 저장
  const saveAllFields = async (storage: StorageReservation) => {
    setUpdatingIds((prev) => new Set(prev).add(storage.id));

    try {
      const updateData: any = {};

      // 모든 편집된 값들을 업데이트 데이터에 포함
      const getValue = (field: string) => editValues[`${storage.id}_${field}`];

      updateData.customer_name = getValue("customerName");
      updateData.phone_number = getValue("phoneNumber");
      updateData.items_description = getValue("itemsDescription");
      updateData.quantity = getValue("quantity");
      updateData.tag_number = getValue("tagNumber") || null;
      updateData.status = getValue("status");
      updateData.notes = getValue("notes") || null;
      updateData.drop_off_date = getValue("dropOffDate");
      updateData.drop_off_time = getValue("dropOffTime");
      updateData.pickup_date = getValue("pickupDate");
      updateData.pickup_time = getValue("pickupTime");

      const { error } = await supabase
        .from("storage_reservations")
        .update(updateData)
        .eq("id", storage.id);

      if (error) {
        alert("업데이트 실패: " + error.message);
      } else {
        // 편집 모드 해제
        toggleEditMode(storage.id);
        // 편집 값 제거
        Object.keys(editValues).forEach((key) => {
          if (key.startsWith(`${storage.id}_`)) {
            setEditValues((prev) => {
              const newValues = { ...prev };
              delete newValues[key];
              return newValues;
            });
          }
        });
        onStatusUpdate?.();
      }
    } catch (error) {
      alert("업데이트 중 오류가 발생했습니다.");
    } finally {
      setUpdatingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(storage.id);
        return newSet;
      });
    }
  };

  // 편집 취소
  const cancelEdit = (storageId: string) => {
    toggleEditMode(storageId);
    // 편집 값 제거
    Object.keys(editValues).forEach((key) => {
      if (key.startsWith(`${storageId}_`)) {
        setEditValues((prev) => {
          const newValues = { ...prev };
          delete newValues[key];
          return newValues;
        });
      }
    });
  };

  // 빠른 상태 업데이트 (기존 기능 유지)
  const handleStatusUpdate = async (storage: StorageReservation) => {
    setUpdatingIds((prev) => new Set(prev).add(storage.id));

    try {
      let newStatus: string;
      let updateData: any = {};

      if (type === "drop-off") {
        newStatus = "stored";
        updateData.status = newStatus;
      } else {
        newStatus = "retrieved";
        updateData.status = newStatus;
      }

      const { error } = await supabase
        .from("storage_reservations")
        .update(updateData)
        .eq("id", storage.id);

      if (error) {
        alert("상태 업데이트 실패: " + error.message);
      } else {
        onStatusUpdate?.();
      }
    } catch (error) {
      alert("업데이트 중 오류가 발생했습니다.");
    } finally {
      setUpdatingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(storage.id);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border-gray-200 bg-gray-50";
      case "stored":
        return "border-blue-200 bg-blue-50";
      case "retrieved":
        return "border-green-200 bg-green-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-gray-500" />;
      case "stored":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "retrieved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActionButtonColor = () => {
    return type === "drop-off"
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-green-600 hover:bg-green-700";
  };

  const getActionButtonText = () => {
    return type === "drop-off" ? "보관 완료" : "픽업 완료";
  };

  const getProcessDescription = () => {
    return type === "drop-off"
      ? "고객이 맡긴 짐을 보관소에 저장하세요"
      : "고객이 찾아갈 짐을 준비하고 전달하세요";
  };

  const getStatusLabel = (status: string) => {
    if (type === "drop-off") {
      switch (status) {
        case "pending":
          return "보관 전";
        case "stored":
          return "보관 완료";
        case "retrieved":
          return "찾아감";
        default:
          return (
            STORAGE_STATUS_LABELS[
              status as keyof typeof STORAGE_STATUS_LABELS
            ] || status
          );
      }
    } else {
      switch (status) {
        case "pending":
          return "대기중";
        case "stored":
          return "픽업 대기";
        case "retrieved":
          return "픽업 완료";
        default:
          return (
            STORAGE_STATUS_LABELS[
              status as keyof typeof STORAGE_STATUS_LABELS
            ] || status
          );
      }
    }
  };

  const getDateTimeText = (storage: StorageReservation) => {
    if (type === "drop-off") {
      return `${storage.drop_off_date} ${storage.drop_off_time.slice(0, 5)}`;
    } else {
      return `${storage.pickup_date} ${storage.pickup_time.slice(0, 5)}`;
    }
  };

  // 현재 편집 값 가져오기
  const getCurrentEditValue = (
    storageId: string,
    field: string,
    originalValue: any
  ) => {
    const key = `${storageId}_${field}`;
    return editValues[key] !== undefined ? editValues[key] : originalValue;
  };

  // 시간 옵션 생성
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}:00`;
        const displayString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        times.push({ value: timeString, label: displayString });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className="grid gap-2 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {storages.map((storage) => {
        const isEditing = editingState[storage.id]?.isEditing;

        return (
          <Card
            key={storage.id}
            className={`${getStatusColor(
              storage.status
            )} border-2 hover:shadow-lg transition-all duration-200`}
          >
            <CardHeader className="p-2 md:p-3 pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(storage.status)}
                  {isEditing ? (
                    <Input
                      value={getCurrentEditValue(
                        storage.id,
                        "customerName",
                        storage.customer_name
                      )}
                      onChange={(e) =>
                        handleEditChange(
                          storage.id,
                          "customerName",
                          e.target.value
                        )
                      }
                      className="text-base md:text-lg font-bold h-8"
                    />
                  ) : (
                    <CardTitle className="text-base md:text-lg font-bold text-gray-800">
                      {storage.customer_name}
                    </CardTitle>
                  )}
                </div>

                {/* 편집/상태 영역 */}
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Select
                      value={getCurrentEditValue(
                        storage.id,
                        "status",
                        storage.status
                      )}
                      onValueChange={(value) =>
                        handleEditChange(storage.id, "status", value)
                      }
                    >
                      <SelectTrigger className="w-24 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">보관 전</SelectItem>
                        <SelectItem value="stored">보관중</SelectItem>
                        <SelectItem value="retrieved">찾아감</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-sm font-medium border-2 bg-white"
                    >
                      {getStatusLabel(storage.status)}
                    </Badge>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleEditMode(storage.id)}
                  >
                    <Edit2 className="w-3 h-3 text-gray-500" />
                  </Button>
                </div>
              </div>

              {/* 핵심 정보 */}
              <div className="space-y-2 pt-1">
                {/* 태그 번호 */}
                <div className="flex items-center gap-1.5 text-xs md:text-sm">
                  <Tag className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                  {isEditing ? (
                    <Input
                      placeholder="태그 번호"
                      value={getCurrentEditValue(
                        storage.id,
                        "tagNumber",
                        storage.tag_number || ""
                      )}
                      onChange={(e) =>
                        handleEditChange(
                          storage.id,
                          "tagNumber",
                          e.target.value
                        )
                      }
                      className="text-sm h-8 flex-1"
                    />
                  ) : (
                    <div className="flex-1">
                      {storage.tag_number ? (
                        <span className="font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded text-xs">
                          {storage.tag_number}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">태그 없음</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 물품 정보 */}
                <div className="flex items-center gap-1.5 text-sm">
                  <Package className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                  {isEditing ? (
                    <div className="flex gap-1 flex-1">
                      <Input
                        placeholder="물품 설명"
                        value={getCurrentEditValue(
                          storage.id,
                          "itemsDescription",
                          storage.items_description
                        )}
                        onChange={(e) =>
                          handleEditChange(
                            storage.id,
                            "itemsDescription",
                            e.target.value
                          )
                        }
                        className="text-sm h-8 flex-1"
                      />
                      <Input
                        type="text"
                        placeholder="개수"
                        value={getCurrentEditValue(
                          storage.id,
                          "quantity",
                          storage.quantity
                        )}
                        onChange={(e) =>
                          handleEditChange(
                            storage.id,
                            "quantity",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="text-sm h-8 w-16 flex-1"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center flex-1">
                      <span className="text-gray-700 truncate max-w-[120px] md:max-w-none">
                        {storage.items_description}
                      </span>
                      <span className="text-gray-800 ml-2">
                        {storage.quantity}개
                      </span>
                    </div>
                  )}
                </div>

                {/* 맡기는 날짜/시간 */}
                <div className="flex items-center gap-1.5 text-sm">
                  <CalendarIcon className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                  {isEditing ? (
                    <div className="flex gap-1 flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "text-sm h-8 flex-1 justify-start text-left font-normal",
                              !getCurrentEditValue(
                                storage.id,
                                "dropOffDate",
                                storage.drop_off_date
                              ) && "text-muted-foreground"
                            )}
                          >
                            {getCurrentEditValue(
                              storage.id,
                              "dropOffDate",
                              storage.drop_off_date
                            )
                              ? format(
                                  new Date(
                                    getCurrentEditValue(
                                      storage.id,
                                      "dropOffDate",
                                      storage.drop_off_date
                                    )
                                  ),
                                  "yyyy-MM-dd",
                                  { locale: ko }
                                )
                              : "날짜 선택"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              getCurrentEditValue(
                                storage.id,
                                "dropOffDate",
                                storage.drop_off_date
                              )
                                ? new Date(
                                    getCurrentEditValue(
                                      storage.id,
                                      "dropOffDate",
                                      storage.drop_off_date
                                    )
                                  )
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                handleEditChange(
                                  storage.id,
                                  "dropOffDate",
                                  format(date, "yyyy-MM-dd")
                                );
                              }
                            }}
                            locale={ko}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Select
                        value={getCurrentEditValue(
                          storage.id,
                          "dropOffTime",
                          storage.drop_off_time
                        )}
                        onValueChange={(value) =>
                          handleEditChange(storage.id, "dropOffTime", value)
                        }
                      >
                        <SelectTrigger className="w-20 h-8 text-sm flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex items-center flex-1">
                      <span className="font-medium text-blue-600">
                        맡기는: {storage.drop_off_date}{" "}
                        {storage.drop_off_time.slice(0, 5)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 찾는 날짜/시간 */}
                <div className="flex items-center gap-1.5 text-sm">
                  <CalendarIcon className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                  {isEditing ? (
                    <div className="flex gap-1 flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "text-sm h-8 flex-1 justify-start text-left font-normal",
                              !getCurrentEditValue(
                                storage.id,
                                "pickupDate",
                                storage.pickup_date
                              ) && "text-muted-foreground"
                            )}
                          >
                            {getCurrentEditValue(
                              storage.id,
                              "pickupDate",
                              storage.pickup_date
                            )
                              ? format(
                                  new Date(
                                    getCurrentEditValue(
                                      storage.id,
                                      "pickupDate",
                                      storage.pickup_date
                                    )
                                  ),
                                  "yyyy-MM-dd",
                                  { locale: ko }
                                )
                              : "날짜 선택"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              getCurrentEditValue(
                                storage.id,
                                "pickupDate",
                                storage.pickup_date
                              )
                                ? new Date(
                                    getCurrentEditValue(
                                      storage.id,
                                      "pickupDate",
                                      storage.pickup_date
                                    )
                                  )
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                handleEditChange(
                                  storage.id,
                                  "pickupDate",
                                  format(date, "yyyy-MM-dd")
                                );
                              }
                            }}
                            locale={ko}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Select
                        value={getCurrentEditValue(
                          storage.id,
                          "pickupTime",
                          storage.pickup_time
                        )}
                        onValueChange={(value) =>
                          handleEditChange(storage.id, "pickupTime", value)
                        }
                      >
                        <SelectTrigger className="w-20 h-8 text-sm flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex items-center flex-1">
                      <span className="font-medium text-green-600">
                        찾는: {storage.pickup_date}{" "}
                        {storage.pickup_time.slice(0, 5)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 전화번호 */}
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                  {isEditing ? (
                    <Input
                      placeholder="전화번호"
                      value={getCurrentEditValue(
                        storage.id,
                        "phoneNumber",
                        storage.phone_number
                      )}
                      onChange={(e) =>
                        handleEditChange(
                          storage.id,
                          "phoneNumber",
                          e.target.value
                        )
                      }
                      className="text-sm h-8 flex-1"
                    />
                  ) : (
                    <span className="text-gray-600 text-sm">
                      {storage.phone_number}
                    </span>
                  )}
                </div>

                {/* 메모 (편집 모드에서만) */}
                {isEditing && (
                  <div className="flex items-start gap-1.5 text-sm">
                    <FileText className="w-3 h-3 md:w-4 md:h-4 text-gray-500 mt-1" />
                    <Textarea
                      placeholder="메모 (선택사항)"
                      value={getCurrentEditValue(
                        storage.id,
                        "notes",
                        storage.notes || ""
                      )}
                      onChange={(e) =>
                        handleEditChange(storage.id, "notes", e.target.value)
                      }
                      className="text-sm min-h-[60px] flex-1"
                    />
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-2 md:p-3 space-y-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveAllFields(storage)}
                    disabled={updatingIds.has(storage.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    {updatingIds.has(storage.id) ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">저장중...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="w-3 h-3" />
                        <span className="text-xs">저장</span>
                      </div>
                    )}
                  </Button>
                  <Button
                    onClick={() => cancelEdit(storage.id)}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    <div className="flex items-center gap-2">
                      <X className="w-3 h-3" />
                      <span className="text-xs">취소</span>
                    </div>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleStatusUpdate(storage)}
                  disabled={updatingIds.has(storage.id)}
                  className={`w-full py-2 md:py-3 text-white font-semibold ${getActionButtonColor()}`}
                  size="sm"
                >
                  {updatingIds.has(storage.id) ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs md:text-sm">처리중...</span>
                    </div>
                  ) : (
                    <span className="text-xs md:text-sm">
                      {getActionButtonText()}
                    </span>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {storages.length === 0 && (
        <div className="col-span-full">
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-8 md:py-12">
              <Package className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mb-2 md:mb-4" />
              <h3 className="text-base md:text-lg font-medium text-gray-500 mb-1 md:mb-2">
                {type === "drop-off"
                  ? "입고할 짐이 없습니다"
                  : "픽업할 짐이 없습니다"}
              </h3>
              <p className="text-xs md:text-sm text-gray-400 text-center">
                {getProcessDescription()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
