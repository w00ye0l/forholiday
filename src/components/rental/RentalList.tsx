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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {/* <TableHead>예약 번호</TableHead> */}
          <TableHead>기기</TableHead>
          <TableHead>수령 일시</TableHead>
          <TableHead>반납 일시</TableHead>
          <TableHead className="text-center">상태</TableHead>
          <TableHead className="text-center">수령 방법</TableHead>
          <TableHead className="text-center">반납 방법</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rentals.map((rental) => (
          <TableRow key={rental.id}>
            {/* <TableCell>{rental.id}</TableCell> */}
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
            <TableCell className="text-center">
              {rental.pickup_method}
            </TableCell>
            <TableCell className="text-center">
              {rental.return_method}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
