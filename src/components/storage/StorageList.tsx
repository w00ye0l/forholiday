"use client";

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
import { createClient } from "@/lib/supabase/client";
import {
  StorageReservation,
  STORAGE_STATUS_LABELS,
  STORAGE_LOCATION_LABELS,
} from "@/types/storage";
import { type ReactNode, Fragment } from "react";
import EmailSendButton from "./EmailSendButton";

interface StorageListProps {
  storages?: StorageReservation[];
  onStorageUpdated?: () => void;
  searchTerm?: string;
}

// 텍스트 하이라이트 함수
const highlightText = (text: string, searchTerm: string): ReactNode => {
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
            <TableHead>메일전송</TableHead>
            <TableHead className="text-center">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {storages.map((storage) => (
            <Fragment key={storage.id}>
              <TableRow>
                <TableCell className="font-medium whitespace-nowrap">
                  <Link
                    href={`/storage/${storage.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {highlightText(storage.reservation_id, searchTerm)}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {highlightText(storage.customer_name, searchTerm)}
                </TableCell>
                <TableCell className="max-w-32 truncate whitespace-nowrap">
                  {highlightText(storage.items_description, searchTerm)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {storage.quantity}개
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {storage.tag_number || "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {storage.drop_off_date} {storage.drop_off_time.slice(0, 5)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {storage.drop_off_location
                    ? STORAGE_LOCATION_LABELS[storage.drop_off_location]
                    : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {storage.pickup_date && storage.pickup_time
                    ? `${storage.pickup_date} ${storage.pickup_time.slice(0, 5)}`
                    : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {storage.pickup_date && storage.pickup_time && storage.pickup_location
                    ? STORAGE_LOCATION_LABELS[storage.pickup_location]
                    : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={getStatusBadgeVariant(storage.status)}>
                    {STORAGE_STATUS_LABELS[storage.status]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {storage.email_sent ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">전송완료</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span className="text-sm">미전송</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EmailSendButton
                      reservationId={storage.reservation_id}
                      customerName={storage.customer_name}
                      defaultEmail={storage.customer_email || ""}
                      emailSent={storage.email_sent || false}
                      onEmailSent={() => onStorageUpdated?.()}
                    />
                    <Link href={`/storage/edit/${storage.id}`}>
                      <Button variant="outline" size="sm">
                        수정
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(storage)}
                    >
                      삭제
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </Fragment>
          ))}
          {storages.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={12}
                className="text-center py-8 text-gray-500"
              >
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
