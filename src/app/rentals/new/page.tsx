"use client";

import { useState, useCallback } from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import { RentalForm } from "@/components/rental/RentalForm";
import { CreateRentalReservationDto } from "@/types/rental";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { uploadContactImage, compressImage } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface FormData {
  id: string;
  triggerValidation?: () => Promise<boolean>;
  getFormData?: () => any;
  getContactImage?: () => File | null;
}

export default function NewRentalPage() {
  const [forms, setForms] = useState<FormData[]>([
    { id: Date.now().toString() },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 새 폼 추가
  const handleAddForm = () => {
    setForms((prev) => [...prev, { id: `${Date.now()}-${Math.random()}` }]);
  };

  // 특정 폼 제거
  const handleRemoveForm = (formId: string) => {
    if (forms.length > 1) {
      setForms((prev) => prev.filter((form) => form.id !== formId));
    }
  };

  // 모든 폼 리셋 (첫 번째 폼만 남기고 나머지 제거)
  const handleResetForms = () => {
    setForms([{ id: `${Date.now()}-${Math.random()}` }]);
  };

  // 폼 준비 완료 시 호출되는 함수
  const handleFormReady = useCallback(
    (
      formId: string,
      triggerValidation: () => Promise<boolean>,
      getFormData: () => any,
      getContactImage: () => File | null
    ) => {
      setForms((prev) =>
        prev.map((form) =>
          form.id === formId
            ? { ...form, triggerValidation, getFormData, getContactImage }
            : form
        )
      );
    },
    []
  );

  // 모든 예약 생성 함수
  const createAllRentals = async () => {
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (forms.length === 0) {
        alert("폼이 없습니다.");
        return;
      }

      // 준비된 폼들만 필터링
      const readyForms = forms.filter(
        (form) =>
          form.triggerValidation && form.getFormData && form.getContactImage
      );

      if (readyForms.length === 0) {
        alert("준비된 폼이 없습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      const allReservations = [];

      // 각 폼의 유효성 검사 및 데이터 수집
      for (const form of readyForms) {
        try {
          // 유효성 검사 실행
          const isValid = await form.triggerValidation!();
          if (!isValid) {
            // 에러가 있는 폼은 건너뛰고 다음 폼 처리 (에러는 폼에서 자동으로 표시됨)
            continue;
          }

          // 폼 데이터 가져오기
          const formData = form.getFormData!();
          const contactImage = form.getContactImage!();

          let processedData = { ...formData };

          // 이미지 업로드가 필요한 경우
          if (processedData.contact_input_type === "image" && contactImage) {
            try {
              const compressedImage = await compressImage(contactImage);
              const imageUrl = await uploadContactImage(compressedImage);
              processedData.contact_image_url = imageUrl;
            } catch (error) {
              console.error("이미지 업로드 실패:", error);
              // 이미지 업로드 실패한 폼은 건너뛰고 다음 폼 처리
              continue;
            }
          }

          // Date 객체를 문자열로 변환하고 data_transmission을 boolean으로 변환
          const formattedData: CreateRentalReservationDto = {
            ...processedData,
            pickup_date: format(processedData.pickup_date, "yyyy-MM-dd"),
            return_date: format(processedData.return_date, "yyyy-MM-dd"),
            data_transmission: processedData.data_transmission === "필요",
          };

          allReservations.push({
            ...formattedData,
            reservation_id: formattedData.order_number,
          });
        } catch (error) {
          console.error(`폼 처리 중 오류 발생:`, error);
          // 오류가 있는 폼은 건너뛰고 다음 폼 처리
        }
      }

      if (allReservations.length === 0) {
        // 처리 가능한 폼이 없으면 조용히 종료 (에러는 각 폼에 표시됨)
        return;
      }

      // 모든 예약을 데이터베이스에 삽입
      const { error } = await supabase
        .from("rental_reservations")
        .insert(allReservations);

      if (error) {
        throw new Error(error.message);
      }

      alert(`${allReservations.length}개의 예약이 성공적으로 생성되었습니다!`);
      router.push("/rentals");
      router.refresh();
    } catch (error) {
      console.error("예약 생성 중 오류 발생:", error);
      alert("예약 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex sm:flex-row flex-col justify-between items-center mb-4 gap-2">
        <h1 className="text-2xl font-bold">신규 예약 추가</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleAddForm}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            추가 예약건 생성
          </Button>
          <Button
            onClick={handleResetForms}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            리셋
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {forms.map((form, index) => (
          <div
            key={form.id}
            className="bg-white p-6 rounded-lg shadow relative"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">예약 폼 #{index + 1}</h2>
              {forms.length > 1 && (
                <Button
                  onClick={() => handleRemoveForm(form.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <RentalForm
              key={form.id}
              formId={form.id}
              onFormReady={handleFormReady}
              showSubmitButton={false}
              isSubmitting={isSubmitting}
            />
          </div>
        ))}
      </div>

      {/* 모든 예약 생성 버튼 */}
      <div className="mt-8 flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/rentals")}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button
          onClick={createAllRentals}
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          {isSubmitting ? "처리중..." : `모든 예약 생성 (${forms.length}개)`}
        </Button>
      </div>
    </div>
  );
}
