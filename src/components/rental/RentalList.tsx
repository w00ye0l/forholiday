"use client";

import { useRouter } from "next/navigation";
import {
  RentalReservation,
  STATUS_MAP,
  PICKUP_METHOD_LABELS,
  RETURN_METHOD_LABELS,
} from "@/types/rental";
import { DEVICE_CATEGORY_LABELS } from "@/types/device";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RentalListProps {
  rentals: (RentalReservation & {
    devices: {
      id: string;
      tag_name: string;
      category: string;
      status: string;
    };
  })[];
  searchTerm?: string;
  loading?: boolean;
}

// 검색어 하이라이트 함수
const highlightText = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <span key={index} className="bg-yellow-200 font-semibold">
        {part}
      </span>
    ) : (
      part
    )
  );
};

export function RentalList({
  rentals,
  searchTerm = "",
  loading = false,
}: RentalListProps) {
  const router = useRouter();

  const handleRowClick = (rentalId: string) => {
    router.push(`/rentals/${rentalId}`);
  };

  // 상태별 행 스타일 반환
  const getRowStyle = (status: string) => {
    const baseClasses = "cursor-pointer transition-colors";

    switch (status) {
      case "pending":
        // 수령전 - 하얀색/무색
        return cn(baseClasses, "hover:bg-gray-50");
      case "picked_up":
        // 수령완료 - 파란색
        return cn(
          baseClasses,
          "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500"
        );
      case "not_picked_up":
        // 미수령 - 취소선, 배경색 무색
        return cn(baseClasses, "line-through opacity-70 hover:bg-gray-50");
      case "returned":
        // 반납완료 - 초록색
        return cn(
          baseClasses,
          "bg-green-50 hover:bg-green-100 border-l-4 border-green-500"
        );
      case "overdue":
        // 미반납 - 노란색
        return cn(
          baseClasses,
          "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500"
        );
      case "problem":
        // 문제있음 - 빨간색
        return cn(
          baseClasses,
          "bg-red-50 hover:bg-red-100 border-l-4 border-red-500"
        );
      default:
        return cn(baseClasses, "hover:bg-gray-50");
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-gray-500 text-center py-8">
          {searchTerm.trim()
            ? `'${searchTerm}' 검색 결과가 없습니다.`
            : "예약된 기기가 없습니다."}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>예약번호</TableHead>
            <TableHead>고객명</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead>대여기기</TableHead>
            <TableHead>수령일</TableHead>
            <TableHead>반납일</TableHead>
            <TableHead>수령방법</TableHead>
            <TableHead>반납방법</TableHead>
            <TableHead className="text-center">상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rentals.map((rental) => (
            <TableRow
              key={rental.id}
              onClick={() => handleRowClick(rental.id)}
              className={getRowStyle(rental.status)}
            >
              <TableCell className="font-medium text-blue-600">
                {highlightText(rental.reservation_id || rental.id, searchTerm)}
              </TableCell>
              <TableCell>
                {highlightText(rental.renter_name, searchTerm)}
              </TableCell>
              <TableCell>
                {highlightText(rental.renter_phone, searchTerm)}
              </TableCell>
              <TableCell>
                {rental.renter_email ? highlightText(rental.renter_email, searchTerm) : "-"}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {DEVICE_CATEGORY_LABELS[rental.device_category] ||
                      rental.device_category}
                  </div>
                  <div className="text-sm text-gray-500">
                    {rental.device_tag_name
                      ? highlightText(rental.device_tag_name, searchTerm)
                      : "미배정"}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div>{rental.pickup_date}</div>
                  <div className="text-sm text-gray-500">
                    {rental.pickup_time}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div>{rental.return_date}</div>
                  <div className="text-sm text-gray-500">
                    {rental.return_time}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {PICKUP_METHOD_LABELS[rental.pickup_method]}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {RETURN_METHOD_LABELS[rental.return_method]}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={STATUS_MAP[rental.status].variant as any}>
                  {STATUS_MAP[rental.status].label}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
