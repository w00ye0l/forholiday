"use client";

import { useState, useEffect, memo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RentalEditDialog } from "@/components/rental/RentalEditDialog";
import {
  RentalReservation,
  ReservationStatus,
  DisplayStatus,
  STATUS_MAP,
  RETURN_METHOD_LABELS,
} from "@/types/rental";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  CalendarIcon,
  PencilIcon,
  PhoneIcon,
  MapPinIcon,
  EditIcon,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { HighlightedText } from "@/components/ui/HighlightedText";

interface ReturnListProps {
  rentals: RentalReservation[];
  onStatusUpdate?: () => void;
  getDisplayStatus: (rental: RentalReservation) => DisplayStatus;
  searchTerm?: string; // 검색어 하이라이트를 위한 prop 추가
}

const ITEMS_PER_PAGE = 50;

export const ReturnList = memo<ReturnListProps>(function ReturnList({
  rentals: initialRentals,
  onStatusUpdate,
  getDisplayStatus,
  searchTerm = "", // 기본값 설정
}) {
  const [rentals, setRentals] = useState(initialRentals);
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [editingRental, setEditingRental] = useState<RentalReservation | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(rentals.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRentals = rentals.slice(startIndex, endIndex);

  // 페이지 번호 생성 (예약 목록과 동일한 로직)
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };



  const supabase = createClient();

  // 상태별 카드 스타일 반환
  const getCardStyle = (status: DisplayStatus) => {
    const baseClasses = "p-3 shadow-sm border-l-4";

    switch (status) {
      case "pending":
        // 수령전 - 하얀색/무색
        return `${baseClasses} bg-white border-l-gray-400`;
      case "picked_up":
        // 수령완료 - 파란색
        return `${baseClasses} bg-blue-50 border-l-blue-500`;
      case "not_picked_up":
        // 미수령 - 취소선, 배경색 무색
        return `${baseClasses} bg-white border-l-red-500 line-through opacity-70`;
      case "returned":
        // 반납완료 - 초록색
        return `${baseClasses} bg-green-50 border-l-green-500`;
      case "overdue":
        // 지연반납 - 노란색
        return `${baseClasses} bg-yellow-50 border-l-yellow-500`;
      case "problem":
        // 문제있음 - 빨간색
        return `${baseClasses} bg-red-50 border-l-red-500`;
      default:
        // 알 수 없는 상태는 기본 스타일
        return `${baseClasses} bg-white border-l-gray-400`;
    }
  };

  // props가 변경될 때 내부 상태 업데이트
  useEffect(() => {
    setRentals(initialRentals);
    setCurrentPage(1); // 새 데이터가 오면 첫 페이지로 리셋
  }, [initialRentals]);

  const handleStatusChange = async (
    id: string,
    newStatus: ReservationStatus
  ) => {
    try {
      setIsUpdating((prev) => ({ ...prev, [id]: true }));

      const { error } = await supabase
        .from("rental_reservations")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setRentals((prev) =>
        prev.map((rental) =>
          rental.id === id ? { ...rental, status: newStatus } : rental
        )
      );

      toast.success("상태가 업데이트되었습니다.");
      onStatusUpdate?.();
    } catch (error) {
      console.error("상태 업데이트 실패:", error);
      toast.error("상태 업데이트에 실패했습니다.");
    } finally {
      setIsUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleNotesUpdate = async (id: string) => {
    try {
      const noteText = notes[id] || "";

      const { error } = await supabase
        .from("rental_reservations")
        .update({ description: noteText })
        .eq("id", id);

      if (error) throw error;

      setRentals((prev) =>
        prev.map((rental) =>
          rental.id === id ? { ...rental, description: noteText } : rental
        )
      );

      setEditingNotes((prev) => ({ ...prev, [id]: false }));
      toast.success("비고가 업데이트되었습니다.");
    } catch (error) {
      console.error("비고 업데이트 실패:", error);
      toast.error("비고 업데이트에 실패했습니다.");
    }
  };

  const startEditingNotes = (id: string, currentDescription?: string) => {
    setEditingNotes((prev) => ({ ...prev, [id]: true }));
    setNotes((prev) => ({ ...prev, [id]: currentDescription || "" }));
  };

  return (
    <>
      <div className="grid gap-2 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedRentals.map((rental) => (
          <Card
            key={rental.id}
            className={getCardStyle(getDisplayStatus(rental))}
          >
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex gap-2 justify-between">
                {/* 메인 정보 (이름, 연락처, 시간) */}
                <div className="flex flex-col justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <HighlightedText
                      text={rental.renter_name}
                      searchTerm={searchTerm}
                      className="font-bold text-sm md:text-base"
                    />
                    <Badge
                      variant="outline"
                      className={`
                        ${
                          getDisplayStatus(rental) === "pending"
                            ? "bg-gray-100 text-gray-800 border-gray-300"
                            : ""
                        }
                        ${
                          getDisplayStatus(rental) === "picked_up"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : ""
                        }
                        ${
                          getDisplayStatus(rental) === "not_picked_up"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : ""
                        }
                        ${
                          getDisplayStatus(rental) === "returned"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : ""
                        }
                        ${
                          getDisplayStatus(rental) === "overdue"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                            : ""
                        }
                        ${
                          getDisplayStatus(rental) === "problem"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : ""
                        }
                      `}
                    >
                      {getDisplayStatus(rental) === "pending" && "수령전"}
                      {getDisplayStatus(rental) === "picked_up" && "수령완료"}
                      {getDisplayStatus(rental) === "not_picked_up" && "미수령"}
                      {getDisplayStatus(rental) === "returned" && "반납완료"}
                      {getDisplayStatus(rental) === "overdue" && "지연 반납"}
                      {getDisplayStatus(rental) === "problem" && "문제있음"}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    <HighlightedText
                      text={rental.reservation_id}
                      searchTerm={searchTerm}
                      className="font-mono"
                    />
                  </div>
                  <div className="text-xs text-gray-600 flex gap-2 items-center">
                    <CalendarIcon className="w-3 h-3" />
                    <span>
                      {format(new Date(rental.return_date), "yyyy.MM.dd", {
                        locale: ko,
                      })}{" "}
                      {rental.return_time.slice(0, 5)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 flex gap-2 items-center">
                    <MapPinIcon className="w-3 h-3" />
                    <span>{RETURN_METHOD_LABELS[rental.return_method]}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex gap-2 items-center">
                    <PhoneIcon className="min-w-3 min-h-3 w-3 h-3" />
                    <HighlightedText
                      text={rental.renter_phone}
                      searchTerm={searchTerm}
                      className="text-xs text-gray-600 break-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-sm">
                  {/* 수정 버튼 */}
                  <div className="w-36 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setEditingRental(rental);
                        setIsDialogOpen(true);
                      }}
                    >
                      <EditIcon className="w-3 h-3" />
                    </Button>
                  </div>
                  {/* 기기 정보 표시 */}
                  <div className="w-36">
                    <div
                      className={`text-sm font-mono px-2 py-1 rounded-md border text-center ${
                        rental.device_tag_name
                          ? "bg-device-assigned text-white"
                          : "bg-white text-gray-800"
                      }`}
                    >
                      {rental.device_tag_name ? (
                        <HighlightedText
                          text={rental.device_tag_name}
                          searchTerm={searchTerm}
                          className=""
                        />
                      ) : (
                        rental.device_category
                      )}
                    </div>
                  </div>

                  {/* 상태 수동 변경 (반납관리용 - 제한된 상태만 선택 가능) */}
                  <div className="w-24">
                    <Select
                      value={rental.status}
                      onValueChange={(value: ReservationStatus) =>
                        handleStatusChange(rental.id, value)
                      }
                      disabled={isUpdating[rental.id]}
                    >
                      <SelectTrigger className="h-6 text-xs bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* 반납관리에서는 수령완료, 미수령, 반납완료, 문제있음만 선택 가능 */}
                        {Object.entries(STATUS_MAP)
                          .filter(
                            ([status]) =>
                              status === "picked_up" ||
                              status === "not_picked_up" ||
                              status === "returned" ||
                              status === "problem"
                          )
                          .map(([status, statusInfo]) => (
                            <SelectItem key={status} value={status}>
                              {statusInfo.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* SD 카드, 데이터 전송 옵션 */}
              <div>
                {rental.sd_option && (
                  <Badge variant="secondary" className="border-gray-400">
                    SD카드 {rental.sd_option}
                  </Badge>
                )}
                {rental.data_transmission && (
                  <Badge variant="secondary" className="border-gray-400">
                    데이터 전송
                  </Badge>
                )}
              </div>

              {/* 비고 및 로딩 */}
              <div className="flex items-center gap-1">
                {editingNotes[rental.id] ? (
                  <>
                    <Input
                      value={notes[rental.id] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [rental.id]: e.target.value,
                        }))
                      }
                      placeholder="비고"
                      className="h-7 text-sm flex-1 min-w-0 bg-white border-gray-400"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleNotesUpdate(rental.id)}
                      className="h-7 w-7 p-0 text-xs flex-shrink-0"
                    >
                      ✓
                    </Button>
                  </>
                ) : (
                  <>
                    <p
                      className="text-sm text-gray-600 break-all min-w-0"
                      title={rental.description || ""}
                    >
                      비고: {rental.description || ""}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        startEditingNotes(rental.id, rental.description)
                      }
                      className="h-7 w-7 p-0 text-xs flex-shrink-0"
                    >
                      <PencilIcon className="w-3 h-3" />
                    </Button>
                  </>
                )}

                {isUpdating[rental.id] && (
                  <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full ml-1 flex-shrink-0"></div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {rentals.length === 0 && (
          <div className="col-span-full text-center py-6 text-gray-500 text-sm">
            반납할 예약이 없습니다.
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {getPageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === "..." ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Rental Edit Dialog */}
      <RentalEditDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        rental={
          editingRental
            ? {
                id: editingRental.id,
                renter_name: editingRental.renter_name,
                renter_phone: editingRental.renter_phone,
                renter_email: editingRental.renter_email,
                pickup_date: editingRental.pickup_date,
                pickup_time: editingRental.pickup_time,
                pickup_terminal: editingRental.pickup_method,
                return_date: editingRental.return_date,
                return_time: editingRental.return_time,
                return_terminal: editingRental.return_method,
                device_category: editingRental.device_category,
                description: editingRental.description,
                sd_option: editingRental.sd_option,
                data_transmission: editingRental.data_transmission,
              }
            : null
        }
        onSave={async (rental) => {
          try {
            const { error } = await supabase
              .from("rental_reservations")
              .update({
                renter_name: rental.renter_name,
                renter_phone: rental.renter_phone,
                renter_email: rental.renter_email,
                pickup_date: rental.pickup_date,
                pickup_time: rental.pickup_time,
                pickup_method: rental.pickup_terminal as any,
                return_date: rental.return_date,
                return_time: rental.return_time,
                return_method: rental.return_terminal as any,
                device_category: rental.device_category,
                description: rental.description,
                sd_option: rental.sd_option,
                data_transmission: rental.data_transmission,
              })
              .eq("id", rental.id);

            if (error) throw error;

            toast.success("예약 정보가 수정되었습니다.");
            setEditingRental(null);
            setIsDialogOpen(false);
            onStatusUpdate?.();
          } catch (error) {
            console.error("예약 수정 실패:", error);
            toast.error("예약 수정에 실패했습니다.");
          }
        }}
      />
    </>
  );
});
