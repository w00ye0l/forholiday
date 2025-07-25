"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StorageReservation, STORAGE_STATUS_LABELS, STORAGE_LOCATION_LABELS } from "@/types/storage";
import React from "react";

interface StorageListProps {
  storages?: StorageReservation[];
  onStorageUpdated?: () => void;
  searchTerm?: string;
}

// 텍스트 하이라이트 함수
const highlightText = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

export default function StorageList({
  storages = [],
  onStorageUpdated,
  searchTerm = "",
}: StorageListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supabase = createClient();

  const handleDelete = async (storage: StorageReservation) => {
    if (!confirm(`"${storage.reservation_id}" 예약을 정말 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("storage_reservations")
        .delete()
        .eq("id", storage.id);

      if (error) {
        alert("삭제 실패: " + error.message);
      } else {
        onStorageUpdated?.();
      }
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleToggleExpand = (storageId: string) => {
    setExpandedId(expandedId === storageId ? null : storageId);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "stored":
        return "default";
      case "retrieved":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>예약번호</TableHead>
            <TableHead>고객명</TableHead>
            <TableHead>물품</TableHead>
            <TableHead>개수</TableHead>
            <TableHead>태그번호</TableHead>
            <TableHead>맡기는 날짜</TableHead>
            <TableHead>맡기는 곳</TableHead>
            <TableHead>찾아가는 날짜</TableHead>
            <TableHead>찾아가는 곳</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {storages.map((storage) => (
            <React.Fragment key={storage.id}>
              <TableRow>
                <TableCell className="font-medium">
                  <Link
                    href={`/storage/${storage.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {highlightText(storage.reservation_id, searchTerm)}
                  </Link>
                </TableCell>
                <TableCell>
                  {highlightText(storage.customer_name, searchTerm)}
                </TableCell>
                <TableCell className="max-w-32 truncate">
                  {highlightText(storage.items_description, searchTerm)}
                </TableCell>
                <TableCell>{storage.quantity}개</TableCell>
                <TableCell>{storage.tag_number || "-"}</TableCell>
                <TableCell>
                  {storage.drop_off_date} {storage.drop_off_time.slice(0, 5)}
                </TableCell>
                <TableCell>
                  {storage.drop_off_location ? STORAGE_LOCATION_LABELS[storage.drop_off_location] : "-"}
                </TableCell>
                <TableCell>
                  {storage.pickup_date} {storage.pickup_time.slice(0, 5)}
                </TableCell>
                <TableCell>
                  {storage.pickup_location ? STORAGE_LOCATION_LABELS[storage.pickup_location] : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(storage.status)}>
                    {STORAGE_STATUS_LABELS[storage.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleExpand(storage.id)}
                    >
                      {expandedId === storage.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              {/* 확장된 상세 정보 */}
              {expandedId === storage.id && (
                <TableRow>
                  <TableCell colSpan={11} className="bg-gray-50">
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            상세 정보
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-600">연락처:</span>{" "}
                              <span className="font-medium">
                                {highlightText(
                                  storage.phone_number,
                                  searchTerm
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">
                                예약 사이트:
                              </span>{" "}
                              <span className="font-medium">
                                {storage.reservation_site}
                              </span>
                            </div>
                            {storage.notes && (
                              <div>
                                <span className="text-gray-600">비고:</span>{" "}
                                <span className="font-medium">
                                  {storage.notes}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            물품 상세
                          </h4>
                          <div className="text-sm">
                            <div className="text-gray-600 mb-1">물품 설명:</div>
                            <div className="font-medium whitespace-pre-wrap bg-white p-2 rounded border">
                              {highlightText(
                                storage.items_description,
                                searchTerm
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
          {storages.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                {searchTerm
                  ? "검색 결과가 없습니다."
                  : "등록된 보관 예약이 없습니다."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
