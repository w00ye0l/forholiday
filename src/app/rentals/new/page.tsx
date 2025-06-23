"use client";

import { useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import { RentalForm } from "@/components/rental/RentalForm";
import { CreateRentalReservationDto } from "@/types/rental";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface FormData {
  id: string;
  isSubmitting: boolean;
}

export default function NewRentalPage() {
  const [forms, setForms] = useState<FormData[]>([
    { id: Date.now().toString(), isSubmitting: false },
  ]);

  // 새 폼 추가
  const handleAddForm = () => {
    setForms((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, isSubmitting: false },
    ]);
  };

  // 특정 폼 제거
  const handleRemoveForm = (formId: string) => {
    if (forms.length > 1) {
      setForms((prev) => prev.filter((form) => form.id !== formId));
    }
  };

  // 모든 폼 리셋 (첫 번째 폼만 남기고 나머지 제거)
  const handleResetForms = () => {
    setForms([{ id: `${Date.now()}-${Math.random()}`, isSubmitting: false }]);
  };

  // 폼 제출 상태 업데이트
  const updateFormSubmittingState = (formId: string, isSubmitting: boolean) => {
    setForms((prev) =>
      prev.map((form) =>
        form.id === formId ? { ...form, isSubmitting } : form
      )
    );
  };

  // 예약 번호 생성 함수
  const generateReservationId = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RT${dateStr}${randomStr}`;
  };

  // 예약 생성 함수
  const createRental = async (
    formId: string,
    data: CreateRentalReservationDto
  ) => {
    updateFormSubmittingState(formId, true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("rental_reservations").insert({
        ...data,
        reservation_id: generateReservationId(),
      });

      if (error) {
        throw new Error(error.message);
      }

      // 성공 시 해당 폼 제거 (또는 성공 메시지 표시)
      alert("예약이 성공적으로 생성되었습니다!");
      handleRemoveForm(formId);
    } catch (error) {
      console.error("예약 생성 중 오류 발생:", error);
      alert("예약 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      updateFormSubmittingState(formId, false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex sm:flex-row flex-col justify-between items-center mb-4 gap-2">
        <h1 className="text-2xl font-bold">새 기기 렌탈 예약</h1>
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
                  disabled={form.isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <RentalForm
              key={form.id} // key를 추가하여 각 폼이 독립적으로 관리되도록 함
              onSubmit={(data) => createRental(form.id, data)}
              isSubmitting={form.isSubmitting}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
