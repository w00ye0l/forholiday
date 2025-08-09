"use client";

import { useEffect, useState } from "react";
import { RentalReservation, DataTransferProcessStatus } from "@/types/rental";
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
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { DropboxCredentialsModal } from "@/components/admin/DropboxCredentialsModal";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { SearchIcon, RefreshCwIcon, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const statusOptions: { value: DataTransferProcessStatus; label: string }[] = [
  { value: "PENDING_UPLOAD", label: "업로드 대기" },
  { value: "UPLOADED", label: "업로드 완료" },
  { value: "EMAIL_SENT", label: "이메일 발송 완료" },
  { value: "ISSUE", label: "문제 발생" },
];

export default function DataTransferPage() {
  const [selectedStatus, setSelectedStatus] = useState<
    DataTransferProcessStatus | "ALL"
  >("ALL");
  const [transfers, setTransfers] = useState<RentalReservation[]>([]);
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

  // 체크박스 상태
  const [selectedTransfers, setSelectedTransfers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // 드롭박스 모달 상태
  const [showDropboxModal, setShowDropboxModal] = useState(false);
  const [currentTransferIds, setCurrentTransferIds] = useState<string[]>([]);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [modalDefaultEmail, setModalDefaultEmail] = useState("");

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
      // rental_reservations 테이블에서 data_transmission = true인 예약들을 조회
      const { data, error } = await supabase
        .from("rental_reservations")
        .select("*")
        .eq("data_transmission", true)
        .is("cancelled_at", null)
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
    reservationId: string,
    newStatus: DataTransferProcessStatus
  ) => {
    try {
      const now = new Date().toISOString();
      const updateData: any = {
        data_transfer_process_status: newStatus,
        updated_at: now,
      };

      // 상태에 따른 추가 필드 업데이트
      if (newStatus === "UPLOADED") {
        updateData.data_transfer_uploaded_at = now;
      } else if (newStatus === "EMAIL_SENT") {
        updateData.data_transfer_email_sent_at = now;
      }

      const { error } = await supabase
        .from("rental_reservations")
        .update(updateData)
        .eq("reservation_id", reservationId);

      if (error) throw error;

      // 로컬 상태 업데이트
      setTransfers((prev) =>
        prev.map((transfer) =>
          transfer.reservation_id === reservationId
            ? { ...transfer, ...updateData }
            : transfer
        )
      );
      toast.success("상태가 변경되었습니다.");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const getStatusBadgeVariant = (
    status: DataTransferProcessStatus | undefined
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
    if (
      selectedStatus !== "ALL" &&
      transfer.data_transfer_process_status !== selectedStatus
    ) {
      return false;
    }

    // 텍스트 검색 필터링
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        transfer.renter_name?.toLowerCase().includes(term) ||
        transfer.renter_phone?.includes(term) ||
        transfer.renter_email?.toLowerCase().includes(term) ||
        transfer.device_tag_name?.toLowerCase().includes(term) ||
        transfer.device_category?.toLowerCase().includes(term);

      if (!matchesSearch) return false;
    }

    // 날짜 필터링 (기간 설정)
    if (dateRange?.from && dateRange?.to && transfer.return_date) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      if (transfer.return_date < fromStr || transfer.return_date > toStr) {
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
          transfer.renter_name?.toLowerCase().includes(term) ||
          transfer.renter_phone?.includes(term) ||
          transfer.renter_email?.toLowerCase().includes(term) ||
          transfer.device_tag_name?.toLowerCase().includes(term) ||
          transfer.device_category?.toLowerCase().includes(term);

        if (!matchesSearch) return false;
      }

      // 날짜 필터링 (기간 설정)
      if (dateRange?.from && dateRange?.to && transfer.return_date) {
        const fromStr = format(dateRange.from, "yyyy-MM-dd");
        const toStr = format(dateRange.to, "yyyy-MM-dd");
        if (transfer.return_date < fromStr || transfer.return_date > toStr) {
          return false;
        }
      }

      return true;
    });

    return {
      all: baseFiltered.length,
      PENDING_UPLOAD: baseFiltered.filter(
        (t) => t.data_transfer_process_status === "PENDING_UPLOAD"
      ).length,
      UPLOADED: baseFiltered.filter(
        (t) => t.data_transfer_process_status === "UPLOADED"
      ).length,
      EMAIL_SENT: baseFiltered.filter(
        (t) => t.data_transfer_process_status === "EMAIL_SENT"
      ).length,
      ISSUE: baseFiltered.filter(
        (t) => t.data_transfer_process_status === "ISSUE"
      ).length,
    };
  };

  const statusCounts = getStatusCounts();

  // 체크박스 핸들러 함수들
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTransfers([]);
    } else {
      const uploadedTransfers = filteredTransfers
        .filter((t) => t.data_transfer_process_status === "UPLOADED")
        .map((t) => t.reservation_id);
      setSelectedTransfers(uploadedTransfers);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectTransfer = (reservationId: string) => {
    setSelectedTransfers((prev) => {
      if (prev.includes(reservationId)) {
        return prev.filter((id) => id !== reservationId);
      } else {
        return [...prev, reservationId];
      }
    });
  };

  // 일괄 이메일 발송 핸들러
  const handleBulkEmail = async () => {
    if (selectedTransfers.length === 0) {
      toast.error("이메일을 발송할 항목을 선택해주세요.");
      return;
    }

    const selectedData = filteredTransfers.filter((t) =>
      selectedTransfers.includes(t.reservation_id)
    );

    // 드롭박스 모달 열기
    setCurrentTransferIds(selectedTransfers);
    // 첫 번째 선택된 항목의 이메일을 기본값으로 설정 (있는 경우)
    const firstSelectedTransfer = selectedData[0];
    setModalDefaultEmail(firstSelectedTransfer?.renter_email || "");
    setShowDropboxModal(true);
  };

  // 개별 이메일 발송 핸들러
  const handleSingleEmail = async (transfer: RentalReservation) => {
    if (transfer.data_transfer_process_status !== "UPLOADED") {
      toast.error("업로드 완료 상태에서만 이메일을 발송할 수 있습니다.");
      return;
    }

    // 개별 전송을 위해 배열 설정
    setCurrentTransferIds([transfer.reservation_id]);
    // 해당 고객의 이메일을 기본값으로 설정
    setModalDefaultEmail(transfer.renter_email || "");
    setShowDropboxModal(true);
  };

  // 드롭박스 정보로 이메일 발송
  const handleEmailWithDropbox = async (credentials: {
    username: string;
    password: string;
    accessInstructions?: string;
    language?: string;
    email: string;
  }) => {
    setIsEmailSending(true);
    try {
      const selectedData = filteredTransfers.filter((t) =>
        currentTransferIds.includes(t.reservation_id)
      );

      const emailPromises = selectedData.map(async (transfer) => {
        try {
          const formData = new FormData();
          formData.append("to", credentials.email); // 모달에서 입력받은 이메일 사용
          formData.append("subject", ""); // 템플릿에서 자동 생성
          formData.append("content", ""); // 템플릿에서 자동 생성
          formData.append("transferId", transfer.reservation_id);
          formData.append("templateType", "data-transfer-completion");
          formData.append("reservationId", transfer.reservation_id);

          // 드롭박스 정보 추가
          formData.append("dropboxUsername", credentials.username);
          formData.append("dropboxPassword", credentials.password);
          if (credentials.accessInstructions) {
            formData.append(
              "accessInstructions",
              credentials.accessInstructions
            );
          }
          // 언어 정보 추가
          formData.append("language", credentials.language || "en");

          const response = await fetch("/api/send-email", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || "Email sending failed");
          }

          // 성공적으로 이메일 발송된 경우 데이터베이스 상태 업데이트
          await supabase
            .from("rental_reservations")
            .update({
              data_transfer_email_sent_at: new Date().toISOString(),
              data_transfer_process_status: "EMAIL_SENT",
            })
            .eq("reservation_id", transfer.reservation_id);

          return { success: true, transferId: transfer.reservation_id };
        } catch (error) {
          console.error(
            `Error sending email for transfer ${transfer.reservation_id}:`,
            error
          );
          return {
            success: false,
            transferId: transfer.reservation_id,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        toast.success(
          `${successCount}개의 이메일이 성공적으로 발송되었습니다.`
        );
      }

      if (failCount > 0) {
        toast.error(`${failCount}개의 이메일 발송에 실패했습니다.`);
      }

      // 데이터 새로고침 및 상태 초기화
      if (successCount > 0) {
        setSelectedTransfers([]);
        setSelectAll(false);
        fetchTransfers();
      }

      // 모달 닫기
      setShowDropboxModal(false);
      setCurrentTransferIds([]);
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      toast.error("이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsEmailSending(false);
    }
  };

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
                  ? `${format(dateRange.from, "yyyy-MM-dd", {
                      locale: ko,
                    })} ~ ${format(dateRange.to, "yyyy-MM-dd", { locale: ko })}`
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
            업로드 대기: {statusCounts.PENDING_UPLOAD}건
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
            이메일 발송 완료: {statusCounts.EMAIL_SENT}건
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
            문제 발생: {statusCounts.ISSUE}건
          </Button>
        </div>

        {/* 필터 결과 표시 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
          <div>
            {dateRange?.from && dateRange?.to ? (
              <span className="font-medium text-blue-600">
                {`${format(dateRange.from, "yyyy년 MM월 dd일", {
                  locale: ko,
                })} ~ ${format(dateRange.to, "yyyy년 MM월 dd일", {
                  locale: ko,
                })} 기간`}
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

      {/* 일괄 이메일 발송 버튼 */}
      {selectedTransfers.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedTransfers.length}개 항목이 선택되었습니다.
            </span>
            <Button
              onClick={handleBulkEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              선택된 항목 이메일 발송
            </Button>
          </div>
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="whitespace-nowrap">대여자</TableHead>
              <TableHead className="whitespace-nowrap">연락처</TableHead>
              <TableHead className="whitespace-nowrap">이메일</TableHead>
              <TableHead className="whitespace-nowrap">기기</TableHead>
              <TableHead className="whitespace-nowrap">반납일자</TableHead>
              <TableHead className="whitespace-nowrap">상태</TableHead>
              <TableHead className="whitespace-nowrap">업로드 일시</TableHead>
              <TableHead className="whitespace-nowrap">
                메일 발송 일시
              </TableHead>
              <TableHead className="text-center whitespace-nowrap">
                작업
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4">
                  데이터 전송 예약이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransfers.map((transfer) => (
                <TableRow key={transfer.reservation_id}>
                  <TableCell className="w-8">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={selectedTransfers.includes(
                        transfer.reservation_id
                      )}
                      onChange={() =>
                        handleSelectTransfer(transfer.reservation_id)
                      }
                      disabled={
                        transfer.data_transfer_process_status !== "UPLOADED"
                      }
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transfer.renter_name || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transfer.renter_phone || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transfer.renter_email || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transfer.device_tag_name ||
                      transfer.device_category ||
                      "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transfer.return_date
                      ? format(new Date(transfer.return_date), "yyyy-MM-dd", {
                          locale: ko,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      variant={getStatusBadgeVariant(
                        transfer.data_transfer_process_status
                      )}
                    >
                      {statusOptions.find(
                        (opt) =>
                          opt.value === transfer.data_transfer_process_status
                      )?.label || "업로드 대기"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transfer.data_transfer_uploaded_at
                      ? format(
                          new Date(transfer.data_transfer_uploaded_at),
                          "yyyy-MM-dd HH:mm",
                          { locale: ko }
                        )
                      : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transfer.data_transfer_email_sent_at
                      ? format(
                          new Date(transfer.data_transfer_email_sent_at),
                          "yyyy-MM-dd HH:mm",
                          { locale: ko }
                        )
                      : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <Select
                        value={
                          transfer.data_transfer_process_status ||
                          "PENDING_UPLOAD"
                        }
                        onValueChange={(value) =>
                          handleStatusChange(
                            transfer.reservation_id,
                            value as DataTransferProcessStatus
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

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSingleEmail(transfer)}
                        disabled={
                          transfer.data_transfer_process_status !== "UPLOADED"
                        }
                        className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                      >
                        메일 전송
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 드롭박스 정보 입력 모달 */}
      <DropboxCredentialsModal
        isOpen={showDropboxModal}
        onClose={() => {
          if (!isEmailSending) {
            setShowDropboxModal(false);
            setCurrentTransferIds([]);
          }
        }}
        onSubmit={handleEmailWithDropbox}
        isLoading={isEmailSending}
        defaultEmail={modalDefaultEmail}
      />
    </div>
  );
}
