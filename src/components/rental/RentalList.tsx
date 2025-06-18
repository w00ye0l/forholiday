"use client";

import { useRouter } from "next/navigation";
import { RentalReservation } from "@/types/rental";
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
}

const statusMap = {
  pending: { label: "대기중", variant: "secondary" },
  confirmed: { label: "확정됨", variant: "default" },
  in_progress: { label: "진행중", variant: "primary" },
  completed: { label: "완료됨", variant: "success" },
  cancelled: { label: "취소됨", variant: "destructive" },
  overdue: { label: "연체", variant: "warning" },
} as const;

export function RentalList({ rentals }: RentalListProps) {
  const router = useRouter();

  const handleRowClick = (rentalId: string) => {
    router.push(`/rentals/${rentalId}`);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>고객명</TableHead>
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
            <TableCell>{rental.renter_name}</TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{rental.devices.category}</div>
                <div className="text-sm text-gray-500">
                  {rental.devices.tag_name}
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
