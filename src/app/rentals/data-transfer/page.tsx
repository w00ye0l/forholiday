"use client";

import { useEffect, useState } from "react";
import { DataTransfer, DataTransferStatus } from "@/types/rental";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const statusOptions: { value: DataTransferStatus; label: string }[] = [
  { value: "PENDING_UPLOAD", label: "업로드전" },
  { value: "UPLOADED", label: "업로드 완료" },
  { value: "EMAIL_SENT", label: "메일발송완료" },
  { value: "ISSUE", label: "문제있음" },
];

export default function DataTransferPage() {
  const [selectedStatus, setSelectedStatus] = useState<
    DataTransferStatus | "ALL"
  >("ALL");
  const [transfers, setTransfers] = useState<DataTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) {
        router.push("/auth/login");
        return;
      }
      fetchTransfers();
    } catch (error) {
      console.error("Error checking auth status:", error);
      router.push("/auth/login");
    }
  };

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from("data_transfers")
        .select(
          `
          *,
          rental:rental_reservations (
            renter_name,
            renter_phone,
            renter_email,
            device_category,
            device_tag_name,
            return_date,
            description
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      toast.error("데이터 전송 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    transferId: string,
    newStatus: DataTransferStatus
  ) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "UPLOADED") {
        updateData.uploaded_at = new Date().toISOString();
      } else if (newStatus === "EMAIL_SENT") {
        updateData.email_sent_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("data_transfers")
        .update(updateData)
        .eq("id", transferId)
        .select(
          `
          *,
          rental:rental_reservations (
            renter_name,
            renter_phone,
            renter_email,
            device_category,
            device_tag_name,
            return_date,
            description
          )
        `
        )
        .single();

      if (error) throw error;

      setTransfers((prev) =>
        prev.map((transfer) => (transfer.id === transferId ? data : transfer))
      );
      toast.success("상태가 변경되었습니다.");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const getStatusBadgeVariant = (
    status: DataTransferStatus
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "PENDING_UPLOAD":
        return "default";
      case "UPLOADED":
        return "secondary";
      case "EMAIL_SENT":
        return "outline";
      case "ISSUE":
        return "destructive";
      default:
        return "default";
    }
  };

  const filteredTransfers = transfers.filter(
    (transfer) => selectedStatus === "ALL" || transfer.status === selectedStatus
  );

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">데이터 관리</h1>
        <Select
          value={selectedStatus}
          onValueChange={(value) =>
            setSelectedStatus(value as DataTransferStatus | "ALL")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="상태 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>대여자</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>기기</TableHead>
              <TableHead>반납일자</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>업로드 일시</TableHead>
              <TableHead>메일 발송 일시</TableHead>
              <TableHead>비고</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{transfer.rental?.renter_name || "-"}</TableCell>
                  <TableCell>{transfer.rental?.renter_phone || "-"}</TableCell>
                  <TableCell>{transfer.rental?.renter_email || "-"}</TableCell>
                  <TableCell>
                    {transfer.rental?.device_tag_name ||
                      transfer.rental?.device_category ||
                      "-"}
                  </TableCell>
                  <TableCell>
                    {transfer.rental?.return_date
                      ? format(
                          new Date(transfer.rental.return_date),
                          "yyyy-MM-dd",
                          { locale: ko }
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(transfer.status)}>
                      {
                        statusOptions.find(
                          (opt) => opt.value === transfer.status
                        )?.label
                      }
                    </Badge>
                  </TableCell>
                  <TableCell>{transfer.uploadedAt || "-"}</TableCell>
                  <TableCell>{transfer.emailSentAt || "-"}</TableCell>
                  <TableCell>
                    {transfer.rental?.description || transfer.issue || "-"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={transfer.status}
                      onValueChange={(value) =>
                        handleStatusChange(
                          transfer.id,
                          value as DataTransferStatus
                        )
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
