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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { SearchIcon, RefreshCwIcon, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState("");
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  });

  // 취소 확인 모달 상태
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(
    null
  );

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
      let query = supabase.from("data_transfers").select(
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
      );

      // 날짜 필터는 클라이언트 사이드에서 처리

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

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

  const handleCancelConfirm = async () => {
    if (!selectedTransferId) return;

    try {
      // 먼저 data_transfer 레코드를 조회하여 rental_id 가져오기
      const { data: transferData, error: transferError } = await supabase
        .from("data_transfers")
        .select("rental_id")
        .eq("id", selectedTransferId)
        .single();

      if (transferError) throw transferError;

      // 1. 예약 테이블의 data_transmission을 false로 변경
      const { error: rentalUpdateError } = await supabase
        .from("rental_reservations")
        .update({
          data_transmission: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transferData.rental_id);

      if (rentalUpdateError) throw rentalUpdateError;

      // 2. data_transfers 테이블에서 해당 레코드 삭제
      const { error: deleteError } = await supabase
        .from("data_transfers")
        .delete()
        .eq("id", selectedTransferId);

      if (deleteError) throw deleteError;

      // 3. 로컬 상태에서 해당 데이터 제거
      setTransfers((prev) =>
        prev.filter((transfer) => transfer.id !== selectedTransferId)
      );

      toast.success("구매가 취소되었습니다.");
    } catch (error) {
      console.error("Error cancelling purchase:", error);
      toast.error("구매 취소에 실패했습니다.");
    } finally {
      setShowCancelDialog(false);
      setSelectedTransferId(null);
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

  // 검색 필터링 로직
  const filteredTransfers = transfers.filter((transfer) => {
    // 상태 필터링
    if (selectedStatus !== "ALL" && transfer.status !== selectedStatus) {
      return false;
    }

    // 텍스트 검색 필터링
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        transfer.rental?.renter_name?.toLowerCase().includes(term) ||
        transfer.rental?.renter_phone?.includes(term) ||
        transfer.rental?.renter_email?.toLowerCase().includes(term) ||
        transfer.rental?.device_tag_name?.toLowerCase().includes(term) ||
        transfer.rental?.device_category?.toLowerCase().includes(term);

      if (!matchesSearch) return false;
    }

    // 날짜 필터링 (기간 설정)
    if (dateRange?.from && dateRange?.to && transfer.rental?.return_date) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      if (transfer.rental.return_date < fromStr || transfer.rental.return_date > toStr) {
        return false;
      }
    }

    return true;
  });

  const handleReset = () => {
    setSearchTerm("");
    setDateRange({
      from: today,
      to: today,
    });
    setSelectedStatus("ALL");
    fetchTransfers();
  };

  // 상태별 개수 계산
  const getStatusCounts = () => {
    // 상태 필터를 제외한 다른 필터들만 적용된 결과
    const baseFiltered = transfers.filter((transfer) => {
      // 텍스트 검색 필터링
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          transfer.rental?.renter_name?.toLowerCase().includes(term) ||
          transfer.rental?.renter_phone?.includes(term) ||
          transfer.rental?.renter_email?.toLowerCase().includes(term) ||
          transfer.rental?.device_tag_name?.toLowerCase().includes(term) ||
          transfer.rental?.device_category?.toLowerCase().includes(term);

        if (!matchesSearch) return false;
      }

      // 날짜 필터링 (기간 설정)
      if (dateRange?.from && dateRange?.to && transfer.rental?.return_date) {
        const fromStr = format(dateRange.from, "yyyy-MM-dd");
        const toStr = format(dateRange.to, "yyyy-MM-dd");
        if (transfer.rental.return_date < fromStr || transfer.rental.return_date > toStr) {
          return false;
        }
      }

      return true;
    });

    return {
      all: baseFiltered.length,
      PENDING_UPLOAD: baseFiltered.filter((t) => t.status === "PENDING_UPLOAD")
        .length,
      UPLOADED: baseFiltered.filter((t) => t.status === "UPLOADED").length,
      EMAIL_SENT: baseFiltered.filter((t) => t.status === "EMAIL_SENT").length,
      ISSUE: baseFiltered.filter((t) => t.status === "ISSUE").length,
    };
  };

  const statusCounts = getStatusCounts();

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
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">데이터 관리</h1>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* 이름/기기명 검색 */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="이름, 연락처, 이메일, 기기명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm pl-9"
            />
          </div>

          {/* 날짜 기간 필터 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, "yyyy-MM-dd", { locale: ko })} ~ ${format(dateRange.to, "yyyy-MM-dd", { locale: ko })}`
                  : "반납 기간 선택"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={ko}
              />
            </PopoverContent>
          </Popover>

          {/* 초기화 버튼 */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className="w-4 h-4" />
            초기화
          </Button>
        </div>

        {/* 상태별 필터 버튼 그룹 */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStatus("ALL")}
            className={`h-6 px-2 py-1 text-xs ${
              selectedStatus === "ALL"
                ? "bg-gray-200 text-gray-900 border-2 border-gray-400"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            전체: {statusCounts.all}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStatus("PENDING_UPLOAD")}
            className={`h-6 px-2 py-1 text-xs ${
              selectedStatus === "PENDING_UPLOAD"
                ? "bg-gray-200 text-gray-900 border-2 border-gray-400"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            업로드전: {statusCounts.PENDING_UPLOAD}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStatus("UPLOADED")}
            className={`h-6 px-2 py-1 text-xs ${
              selectedStatus === "UPLOADED"
                ? "bg-blue-200 text-blue-900 border-2 border-blue-400"
                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
            }`}
          >
            업로드 완료: {statusCounts.UPLOADED}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStatus("EMAIL_SENT")}
            className={`h-6 px-2 py-1 text-xs ${
              selectedStatus === "EMAIL_SENT"
                ? "bg-green-200 text-green-900 border-2 border-green-400"
                : "bg-green-100 text-green-800 hover:bg-green-200"
            }`}
          >
            메일발송완료: {statusCounts.EMAIL_SENT}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStatus("ISSUE")}
            className={`h-6 px-2 py-1 text-xs ${
              selectedStatus === "ISSUE"
                ? "bg-red-200 text-red-900 border-2 border-red-400"
                : "bg-red-100 text-red-800 hover:bg-red-200"
            }`}
          >
            문제있음: {statusCounts.ISSUE}건
          </Button>
        </div>

        {/* 필터 결과 표시 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
          <div>
            {dateRange?.from && dateRange?.to ? (
              <span className="font-medium text-blue-600">
                {`${format(dateRange.from, "yyyy년 MM월 dd일", { locale: ko })} ~ ${format(dateRange.to, "yyyy년 MM월 dd일", { locale: ko })} 기간`}
              </span>
            ) : (
              <span className="font-medium text-blue-600">전체 기간</span>
            )}
            <span className="ml-2">
              총 {filteredTransfers.length}개의 데이터
            </span>
            {filteredTransfers.length !== transfers.length && (
              <span className="text-gray-400 ml-2">
                (전체 {transfers.length}건 중)
              </span>
            )}
          </div>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input type="checkbox" className="accent-primary" disabled />
              </TableHead>
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
              <TableHead>구매 취소</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-4">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="w-8">
                    <input type="checkbox" className="accent-primary" />
                  </TableCell>
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
                  <TableCell>
                    {transfer.uploaded_at
                      ? format(
                          new Date(transfer.uploaded_at),
                          "yyyy-MM-dd HH:mm",
                          { locale: ko }
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {transfer.email_sent_at
                      ? format(
                          new Date(transfer.email_sent_at),
                          "yyyy-MM-dd HH:mm",
                          { locale: ko }
                        )
                      : "-"}
                  </TableCell>
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
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedTransferId(transfer.id);
                        setShowCancelDialog(true);
                      }}
                      className="h-8 px-3"
                    >
                      구매 취소
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 구매 취소 확인 모달 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구매 취소 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 데이터 구매를 취소하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>
              구매 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
