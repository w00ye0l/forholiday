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
  RentalReservation,
  STATUS_MAP,
  PICKUP_METHOD_LABELS,
  RETURN_METHOD_LABELS,
  RESERVATION_SITE_LABELS,
} from "@/types/rental";
import { DEVICE_CATEGORY_LABELS } from "@/types/device";
import { RentalEditForm } from "@/components/rental/RentalEditForm";
import { toast } from "sonner";

interface RentalDetail extends RentalReservation {
  devices: {
    id: string;
    tag_name: string;
    category: string;
    status: string;
  };
}

// 모든 라벨 매핑은 이제 @/types/rental에서 import됨

export default function RentalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [rental, setRental] = useState<RentalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRentalDetail() {
      try {
        const supabase = createClient();

        // 예약 정보 조회
        const { data: rental, error: rentalError } = await supabase
          .from("rental_reservations")
          .select("*")
          .eq("id", params.id)
          .single();

        if (rentalError) {
          throw rentalError;
        }

        // 기기 정보 조회 (device_tag_name이 있을 때만)
        let device = null;
        if (rental.device_tag_name) {
          const { data: deviceData, error: deviceError } = await supabase
            .from("devices")
            .select("id, tag_name, category, status")
            .eq("tag_name", rental.device_tag_name)
            .single();

          if (deviceError) {
            console.warn("기기 정보 조회 실패:", deviceError);
          } else {
            device = deviceData;
          }
        }

        // 예약과 기기 정보 조합
        const rentalWithDevice = {
          ...rental,
          devices: device || {
            id: "",
            tag_name: rental.device_tag_name || "",
            category: rental.device_category,
            status: "unknown",
          },
        };

        setRental(rentalWithDevice);
      } catch (err) {
        setError("예약 정보를 불러오는데 실패했습니다.");
        console.error("예약 상세 조회 에러:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchRentalDetail();
    }
  }, [params.id]);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (data: Partial<RentalReservation>) => {
    if (!rental) {
      toast.error("예약 정보를 찾을 수 없습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // updated_at 필드 추가
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      console.log("Updating rental with data:", updateData);

      const { data: updatedData, error } = await supabase
        .from("rental_reservations")
        .update(updateData)
        .eq("id", rental.id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      console.log("Update successful:", updatedData);

      // 성공적으로 업데이트된 데이터로 로컬 상태 업데이트
      const updatedRental = {
        ...rental,
        ...updatedData,
        devices: rental.devices // 기기 정보는 유지
      } as RentalDetail;

      setRental(updatedRental);
      setIsEditModalOpen(false);
      toast.success("예약 정보가 성공적으로 수정되었습니다.");
    } catch (err) {
      console.error("예약 수정 실패:", err);
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(`예약 정보 수정에 실패했습니다: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!rental) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("rental_reservations")
        .delete()
        .eq("id", rental.id);

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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">예약 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (error || !rental) {
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
        <h1 className="text-2xl font-bold text-green-600">예약 상세 정보</h1>
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
                  {rental.renter_name}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  대여기기
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {DEVICE_CATEGORY_LABELS[
                    rental.device_category as keyof typeof DEVICE_CATEGORY_LABELS
                  ] || rental.device_category}
                </td>
              </tr>
              {rental.order_number && (
                <tr className="border-b">
                  <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                    주문번호
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {rental.order_number}
                  </td>
                </tr>
              )}
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  데이터 전송
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {rental.data_transmission ? "신청" : "미신청"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  SD 옵션
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {rental.sd_option || "없음"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  연락처
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {rental.contact_image_url ? (
                    <div className="flex items-center gap-2">
                      <span>QR코드</span>
                      <img
                        src={rental.contact_image_url}
                        alt="연락처 QR코드"
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                  ) : (
                    rental.renter_phone || "-"
                  )}
                </td>
              </tr>
              {rental.renter_email && (
                <tr className="border-b">
                  <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                    이메일
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {rental.renter_email}
                  </td>
                </tr>
              )}
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  비고
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {rental.description || "-"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  수령일
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {rental.pickup_date}{" "}
                  {parseInt(rental.pickup_time.slice(0, 2)) > 12
                    ? "오후"
                    : "오전"}{" "}
                  {rental.pickup_time}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  반납일
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {rental.return_date}{" "}
                  {parseInt(rental.return_time.slice(0, 2)) > 12
                    ? "오후"
                    : "오전"}{" "}
                  {rental.return_time}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  수령 방법
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {
                    PICKUP_METHOD_LABELS[
                      rental.pickup_method as keyof typeof PICKUP_METHOD_LABELS
                    ]
                  }
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  반납 방법
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {
                    RETURN_METHOD_LABELS[
                      rental.return_method as keyof typeof RETURN_METHOD_LABELS
                    ]
                  }
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  상태
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_MAP[rental.status].variant as any}>
                    {STATUS_MAP[rental.status].label}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  주소
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {rental.renter_address}
                </td>
              </tr>
              <tr>
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  예약사이트
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {
                    RESERVATION_SITE_LABELS[
                      rental.reservation_site as keyof typeof RESERVATION_SITE_LABELS
                    ]
                  }
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
            <DialogTitle>예약 정보 수정</DialogTitle>
          </DialogHeader>

          <RentalEditForm
            rental={rental}
            onSubmit={handleSaveEdit}
            onCancel={() => setIsEditModalOpen(false)}
            isSubmitting={isSubmitting}
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
