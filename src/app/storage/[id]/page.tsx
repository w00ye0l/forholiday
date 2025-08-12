"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  StorageReservation,
  STORAGE_STATUS_LABELS,
  RESERVATION_SITE_LABELS,
  STORAGE_LOCATION_LABELS,
} from "@/types/storage";
import StorageForm from "@/components/storage/StorageForm";
import { toast } from "sonner";

export default function StorageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [storage, setStorage] = useState<StorageReservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchStorageDetail() {
      try {
        const supabase = createClient();

        const { data: storage, error: storageError } = await supabase
          .from("storage_reservations")
          .select("*")
          .eq("id", params.id)
          .single();

        if (storageError) {
          throw storageError;
        }

        setStorage(storage);
      } catch (err) {
        setError("예약 정보를 불러오는데 실패했습니다.");
        console.error("예약 상세 조회 에러:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchStorageDetail();
    }
  }, [params.id]);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsEditModalOpen(false);
    // 데이터 새로고침
    const supabase = createClient();
    const { data: updatedStorage } = await supabase
      .from("storage_reservations")
      .select("*")
      .eq("id", params.id)
      .single();
    
    if (updatedStorage) {
      setStorage(updatedStorage);
    }
  };

  const handleDelete = async () => {
    if (!storage) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("storage_reservations")
        .delete()
        .eq("id", storage.id);

      if (error) throw error;

      toast.success("예약이 성공적으로 삭제되었습니다.");
      router.back();
    } catch (err) {
      console.error("예약 삭제 실패:", err);
      toast.error("예약 삭제에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "stored":
        return "default";
      case "retrieved":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatDateTime = (date: string, time: string) => {
    return `${date} ${time.slice(0, 5)}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">예약 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (error || !storage) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-red-500 p-4 border border-red-300 rounded">
          {error || "예약 정보를 찾을 수 없습니다."}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      <div className="flex flex-col items-start gap-4 mb-8">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Button>
        <h1 className="text-2xl font-bold text-green-600">보관 예약 상세 정보</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow">
        <div className="overflow-hidden">
          <table className="w-full">
            <tbody>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900 w-32">
                  고객명
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {storage.customer_name}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  연락처
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {storage.phone_number || "-"}
                </td>
              </tr>
              {storage.customer_email && (
                <tr className="border-b">
                  <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                    이메일
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {storage.customer_email}
                  </td>
                </tr>
              )}
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  물품 내용
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {storage.items_description || "-"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  수량
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {storage.quantity}개
                </td>
              </tr>
              {storage.tag_number && (
                <tr className="border-b">
                  <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                    태그 번호
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {storage.tag_number}
                  </td>
                </tr>
              )}
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  맡기는 일시
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatDateTime(storage.drop_off_date, storage.drop_off_time)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  맡기는 곳
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {storage.drop_off_location
                    ? STORAGE_LOCATION_LABELS[storage.drop_off_location]
                    : "-"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  찾아가는 일시
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {storage.pickup_date && storage.pickup_time
                    ? formatDateTime(storage.pickup_date, storage.pickup_time)
                    : "미정"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  찾아가는 곳
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {storage.pickup_date && storage.pickup_time && storage.pickup_location
                    ? STORAGE_LOCATION_LABELS[storage.pickup_location]
                    : "미정"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  상태
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusBadgeVariant(storage.status) as any}>
                    {STORAGE_STATUS_LABELS[storage.status]}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  비고
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {storage.notes || "-"}
                </td>
              </tr>
              <tr>
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  예약사이트
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {RESERVATION_SITE_LABELS[
                    storage.reservation_site as keyof typeof RESERVATION_SITE_LABELS
                  ] || storage.reservation_site}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-200 rounded-b-lg bg-gray-50">
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleEdit}
              variant="default"
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              수정
            </Button>
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>
      </div>

      {/* 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>보관 예약 정보 수정</DialogTitle>
          </DialogHeader>

          <StorageForm
            storage={storage}
            onCreated={handleSaveEdit}
            onCancel={() => setIsEditModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>예약 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 예약을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
