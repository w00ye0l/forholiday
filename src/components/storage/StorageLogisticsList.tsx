"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  Package,
  Clock,
  User,
  Phone,
  Calendar,
  Hash,
  FileText,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StorageReservation, STORAGE_STATUS_LABELS } from "@/types/storage";

interface StorageLogisticsListProps {
  storages: StorageReservation[];
  type: "drop-off" | "pick-up";
  onStatusUpdate?: () => void;
}

export default function StorageLogisticsList({
  storages,
  type,
  onStatusUpdate,
}: StorageLogisticsListProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const supabase = createClient();

  const handleStatusUpdate = async (storage: StorageReservation) => {
    setUpdatingIds((prev) => new Set(prev).add(storage.id));

    try {
      let newStatus: string;
      let updateData: any = {};

      if (type === "drop-off") {
        // 대기중 → 보관중
        newStatus = "stored";
        updateData.status = newStatus;

        // 태그 번호가 입력된 경우 업데이트
        const tagNumber = tagInputs[storage.id];
        if (tagNumber && tagNumber.trim()) {
          updateData.tag_number = tagNumber.trim();
        }
      } else {
        // 보관중 → 찾아감
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
        // 태그 입력 초기화
        setTagInputs((prev) => {
          const newInputs = { ...prev };
          delete newInputs[storage.id];
          return newInputs;
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

  const handleTagInputChange = (storageId: string, value: string) => {
    setTagInputs((prev) => ({
      ...prev,
      [storageId]: value,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border-white-200 bg-gray-50";
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

  return (
    <div className="grid gap-2 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {storages.map((storage) => (
        <Card
          key={storage.id}
          className={`${getStatusColor(
            storage.status
          )} border-2 hover:shadow-lg transition-all duration-200`}
        >
          <CardHeader className="p-2 md:p-3 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(storage.status)}
                <CardTitle className="text-base md:text-lg font-bold text-gray-800">
                  {storage.customer_name}
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className="text-xs md:text-sm font-medium border-2"
              >
                {getStatusLabel(storage.status)}
              </Badge>
            </div>

            {/* 핵심 정보 */}
            <div className="space-y-1 pt-1">
              {storage.tag_number && (
                <div className="flex items-center gap-1.5 text-xs md:text-sm">
                  <Tag className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                  <span className="font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded text-xs">
                    {storage.tag_number}
                  </span>
                </div>
              )}

              <div className="flex items-center text-sm">
                <div className="flex items-center gap-1.5">
                  <Package className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                  <span className="text-gray-700 truncate max-w-[120px] md:max-w-none">
                    {storage.items_description}
                  </span>
                </div>
                <span className="text-gray-800 ml-2">{storage.quantity}개</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                  <span className="font-medium text-blue-600">
                    {getDateTimeText(storage)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                  <span className="text-gray-600 text-sm">
                    {storage.phone_number}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-2 md:p-3 space-y-2">
            {/* 태그 입력 (Drop-off이고 태그가 없는 경우) */}
            {!storage.tag_number && type === "drop-off" && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <Tag className="w-3 h-3 text-gray-500" />
                  <span className="font-medium text-gray-700">태그:</span>
                </div>
                <Input
                  placeholder="태그 번호"
                  value={tagInputs[storage.id] || ""}
                  onChange={(e) =>
                    handleTagInputChange(storage.id, e.target.value)
                  }
                  className="text-xs h-8"
                />
              </div>
            )}

            {/* 액션 버튼 */}
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
          </CardContent>
        </Card>
      ))}

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
