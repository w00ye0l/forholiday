"use client";

import { useRouter } from "next/navigation";
import { RentalReservation } from "@/types/rental";
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
}

const statusMap = {
  pending: { label: "수령전", variant: "secondary" },
  picked_up: { label: "수령완료", variant: "default" },
  not_picked_up: { label: "미수령", variant: "destructive" },
} as const;

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

export function RentalList({ rentals, searchTerm = "" }: RentalListProps) {
  const router = useRouter();

  const handleRowClick = (rentalId: string) => {
    router.push(`/rentals/${rentalId}`);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>예약번호</TableHead>
          <TableHead>고객명</TableHead>
          <TableHead>연락처</TableHead>
          <TableHead>대여기기</TableHead>
          <TableHead>수령일</TableHead>
          <TableHead>반납일</TableHead>
          <TableHead className="text-center">상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rentals.map((rental) => (
          <TableRow
            key={rental.id}
            onClick={() => handleRowClick(rental.id)}
            className="cursor-pointer hover:bg-gray-50 transition-colors"
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
            <TableCell className="text-center">
              <Badge variant={statusMap[rental.status].variant as any}>
                {statusMap[rental.status].label}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
