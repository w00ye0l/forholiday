"use client";

import { useState } from "react";
import {
  DEVICE_CATEGORY_LABELS,
  DEVICE_STATUS_MAP,
  Device,
  DeviceCategory,
  DeviceStatus,
} from "@/types/device";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "../ui/badge";

interface DeviceManagerProps {
  devices?: Device[];
  onDeviceUpdated?: () => void;
  onEditDevice?: (device: Device) => void;
}

export default function DeviceManager({
  devices = [],
  onDeviceUpdated,
  onEditDevice,
}: DeviceManagerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  const handleDelete = async (device: Device) => {
    if (!confirm(`"${device.tag_name}" 기기를 정말 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(device.id);
    try {
      const { error } = await supabase
        .from("devices")
        .delete()
        .eq("id", device.id);

      if (error) {
        alert("삭제 실패: " + error.message);
      } else {
        onDeviceUpdated?.();
      }
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (device: Device) => {
    onEditDevice?.(device);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>태그번호</TableHead>
          <TableHead>카테고리</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>생성일</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {devices.map((device) => (
          <TableRow key={device.id}>
            <TableCell className="font-medium">{device.tag_name}</TableCell>
            <TableCell>
              {DEVICE_CATEGORY_LABELS[device.category as DeviceCategory] ?? "-"}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  DEVICE_STATUS_MAP[device.status as DeviceStatus]
                    ?.variant as any
                }
              >
                {DEVICE_STATUS_MAP[device.status as DeviceStatus]?.label ?? "-"}
              </Badge>
            </TableCell>
            <TableCell>{device.created_at.slice(0, 10)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(device)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(device)}
                  disabled={deletingId === device.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {devices.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
              등록된 기기가 없습니다.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
