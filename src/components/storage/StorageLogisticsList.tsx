"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  CalendarIcon,
  PencilIcon,
  PhoneIcon,
  EditIcon,
  TagIcon,
  PackageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StorageReservation, StorageStatus } from "@/types/storage";
import { toast } from "sonner";
import { StorageEditDialog } from "./StorageEditDialog";

interface StorageLogisticsListProps {
  storages: StorageReservation[];
  type: "drop-off" | "pick-up";
  onStatusUpdate?: () => void;
  searchTerm?: string;
  loading?: boolean;
}

// 검색어 하이라이트 함수
const highlightText = (text: string, searchTerm: string = "") => {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")})`,
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

export default function StorageLogisticsList({
  storages: initialStorages,
  type,
  onStatusUpdate,
  searchTerm = "",
  loading = false,
}: StorageLogisticsListProps) {
  const [storages, setStorages] = useState(initialStorages);
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState<StorageReservation | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.ceil(storages.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedStorages = storages.slice(startIndex, endIndex);

  const supabase = createClient();

  // 페이지 번호 생성
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

  // 상태별 카드 스타일 반환
  const getCardStyle = (status: string) => {
    const baseClasses = "p-3 shadow-sm border-l-4";

    switch (status) {
      case "pending":
        // 대기중 - 회색
        return `${baseClasses} bg-white border-l-gray-400`;
      case "stored":
        // 보관중 - 파란색
        return `${baseClasses} bg-blue-50 border-l-blue-500`;
      case "retrieved":
        // 픽업완료 - 초록색
        return `${baseClasses} bg-green-50 border-l-green-500`;
      default:
        return `${baseClasses} bg-white border-l-gray-400`;
    }
  };

  // props가 변경될 때 내부 상태 업데이트
  useEffect(() => {
    setStorages(initialStorages);
    setCurrentPage(1);
  }, [initialStorages]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setIsUpdating((prev) => ({ ...prev, [id]: true }));

      const { error } = await supabase
        .from("storage_reservations")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setStorages((prev) =>
        prev.map((storage) =>
          storage.id === id
            ? { ...storage, status: newStatus as StorageStatus }
            : storage
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
        .from("storage_reservations")
        .update({ notes: noteText })
        .eq("id", id);

      if (error) throw error;

      setStorages((prev) =>
        prev.map((storage) =>
          storage.id === id ? { ...storage, notes: noteText } : storage
        )
      );

      setEditingNotes((prev) => ({ ...prev, [id]: false }));
      toast.success("메모가 업데이트되었습니다.");
    } catch (error) {
      console.error("메모 업데이트 실패:", error);
      toast.error("메모 업데이트에 실패했습니다.");
    }
  };

  const startEditingNotes = (id: string, currentNotes?: string) => {
    setEditingNotes((prev) => ({ ...prev, [id]: true }));
    setNotes((prev) => ({ ...prev, [id]: currentNotes || "" }));
  };

  const handleEditClick = (storage: StorageReservation) => {
    setSelectedStorage(storage);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (updatedStorage: StorageReservation) => {
    try {
      setIsSavingEdit(true);
      
      const { error } = await supabase
        .from("storage_reservations")
        .update({
          customer_name: updatedStorage.customer_name,
          phone_number: updatedStorage.phone_number,
          customer_email: updatedStorage.customer_email,
          items_description: updatedStorage.items_description,
          quantity: updatedStorage.quantity,
          tag_number: updatedStorage.tag_number,
          drop_off_date: updatedStorage.drop_off_date,
          drop_off_time: updatedStorage.drop_off_time,
          drop_off_location: updatedStorage.drop_off_location,
          pickup_date: updatedStorage.pickup_date,
          pickup_time: updatedStorage.pickup_time,
          pickup_location: updatedStorage.pickup_location,
          reservation_site: updatedStorage.reservation_site,
          notes: updatedStorage.notes,
        })
        .eq("id", updatedStorage.id);

      if (error) throw error;

      // 로컬 상태 업데이트
      setStorages((prev) =>
        prev.map((storage) =>
          storage.id === updatedStorage.id ? updatedStorage : storage
        )
      );

      toast.success("예약 정보가 업데이트되었습니다.");
      setEditDialogOpen(false);
      onStatusUpdate?.();
    } catch (error) {
      console.error("예약 정보 업데이트 실패:", error);
      toast.error("예약 정보 업데이트에 실패했습니다.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (storages.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-gray-500 text-center py-8">
          {searchTerm.trim()
            ? `'${searchTerm}' 검색 결과가 없습니다.`
            : "등록된 예약이 없습니다."}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-2 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedStorages.map((storage) => (
          <Card key={storage.id} className={getCardStyle(storage.status)}>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex gap-2 justify-between">
                {/* 메인 정보 */}
                <div className="flex flex-col justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">
                      {highlightText(storage.customer_name, searchTerm)}
                    </span>
                  </div>

                  {/* 맡기는 일시 */}
                  <div className="text-xs text-gray-600 flex gap-2 items-center">
                    <CalendarIcon className="w-3 h-3" />
                    <span className="text-blue-600">
                      맡기는: {storage.drop_off_date}{" "}
                      {storage.drop_off_time?.slice(0, 5)}
                      {storage.drop_off_location &&
                        ` (${storage.drop_off_location})`}
                    </span>
                  </div>

                  {/* 찾는 일시 */}
                  <div className="text-xs text-gray-600 flex gap-2 items-center">
                    <CalendarIcon className="w-3 h-3" />
                    {storage.pickup_date && storage.pickup_time ? (
                      <span className="text-green-600">
                        찾는: {storage.pickup_date}{" "}
                        {storage.pickup_time.slice(0, 5)}
                        {storage.pickup_location &&
                          ` (${storage.pickup_location})`}
                      </span>
                    ) : (
                      <span className="text-gray-400">픽업 정보 없음</span>
                    )}
                  </div>

                  {/* 연락처 */}
                  <div className="text-xs text-gray-600 flex gap-2 items-center">
                    <PhoneIcon className="min-w-3 min-h-3 w-3 h-3" />
                    <span className="text-xs text-gray-600 break-all">
                      {highlightText(storage.phone_number, searchTerm)}
                    </span>
                  </div>

                  {/* 태그번호 */}
                  {storage.tag_number && (
                    <div className="text-xs text-gray-600 flex gap-2 items-center">
                      <TagIcon className="min-w-3 min-h-3 w-3 h-3 text-blue-600" />
                      <span className="font-bold font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded-md border border-blue-200">
                        #{storage.tag_number}
                      </span>
                    </div>
                  )}

                  {/* 물품 정보 */}
                  <div className="text-xs text-gray-600 flex gap-2 items-center">
                    <PackageIcon className="min-w-3 min-h-3 w-3 h-3" />
                    <span className="text-xs text-gray-600 break-all">
                      {highlightText(storage.items_description, searchTerm)}
                      {storage.quantity && ` (${storage.quantity}개)`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-sm">
                  {/* 수정 버튼 */}
                  <div className="w-24 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEditClick(storage)}
                    >
                      <EditIcon className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* 상태 표시/변경 */}
                  <div className="w-24">
                    <Select
                      value={storage.status}
                      onValueChange={(value) =>
                        handleStatusChange(storage.id, value)
                      }
                      disabled={isUpdating[storage.id]}
                    >
                      <SelectTrigger className="h-6 text-xs bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">대기중</SelectItem>
                        <SelectItem value="stored">보관중</SelectItem>
                        <SelectItem value="retrieved">픽업완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 액션 버튼 */}
                  {type === "drop-off" && storage.status === "pending" && (
                    <Button
                      onClick={() => handleStatusChange(storage.id, "stored")}
                      disabled={isUpdating[storage.id]}
                      size="sm"
                      className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      {isUpdating[storage.id] ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "보관완료"
                      )}
                    </Button>
                  )}
                  {type === "pick-up" && storage.status === "stored" && (
                    <Button
                      onClick={() =>
                        handleStatusChange(storage.id, "retrieved")
                      }
                      disabled={isUpdating[storage.id]}
                      size="sm"
                      className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                    >
                      {isUpdating[storage.id] ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "픽업완료"
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* 메모 */}
              <div className="flex items-center gap-1">
                {editingNotes[storage.id] ? (
                  <>
                    <Input
                      value={notes[storage.id] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [storage.id]: e.target.value,
                        }))
                      }
                      placeholder="메모"
                      className="h-7 text-sm flex-1 min-w-0 bg-white border-gray-400"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleNotesUpdate(storage.id)}
                      className="h-7 w-7 p-0 text-xs flex-shrink-0"
                    >
                      ✓
                    </Button>
                  </>
                ) : (
                  <>
                    <p
                      className="text-sm text-gray-600 break-all min-w-0"
                      title={storage.notes || "메모 없음"}
                    >
                      메모: {storage.notes || "메모 없음"}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        startEditingNotes(storage.id, storage.notes)
                      }
                      className="h-7 w-7 p-0 text-xs flex-shrink-0"
                    >
                      <PencilIcon className="w-3 h-3" />
                    </Button>
                  </>
                )}

                {isUpdating[storage.id] && (
                  <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full ml-1 flex-shrink-0"></div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {storages.length === 0 && (
          <div className="col-span-full text-center py-6 text-gray-500 text-sm">
            {type === "drop-off" ? "입고할" : "출고할"} 예약이 없습니다.
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

      {/* 수정 다이얼로그 */}
      <StorageEditDialog
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        storage={selectedStorage}
        onSave={handleSaveEdit}
        isSaving={isSavingEdit}
      />
    </>
  );
}
