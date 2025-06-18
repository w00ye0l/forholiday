import {
  DEVICE_CATEGORY_LABELS,
  DEVICE_STATUS_LABELS,
  Device,
} from "@/types/device";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DeviceManagerProps {
  devices?: Device[];
}

export default function DeviceManager({ devices = [] }: DeviceManagerProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>태그번호</TableHead>
          <TableHead>카테고리</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>생성일</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {devices.map((device) => (
          <TableRow key={device.id}>
            <TableCell>{device.tag_name}</TableCell>
            <TableCell>{DEVICE_CATEGORY_LABELS[device.category]}</TableCell>
            <TableCell>{DEVICE_STATUS_LABELS[device.status]}</TableCell>
            <TableCell>{device.created_at.slice(0, 10)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
