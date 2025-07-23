"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";
import { useArrivalCheckinContent } from "@/lib/hooks/useArrivalCheckinContent";

// 언어 선택 옵션
const selectLanguageLabels = {
  ko: "언어 선택",
  en: "Select Language",
  ja: "言語選択",
};

type LanguageCode = "ko" | "en" | "ja";

const languages = [
  { code: "ko" as const, name: "한국어" },
  { code: "en" as const, name: "English" },
  { code: "ja" as const, name: "日本語" },
];

interface CheckinFormData {
  name: string;
  terminal: string;
  arrivalStatus: string;
  serviceType: string;
  tagName: string;
}

export default function ArrivalCheckinPage() {
  const [language, setLanguage] = useState<LanguageCode>("ko");
  const [formData, setFormData] = useState<CheckinFormData>({
    name: "",
    terminal: "",
    arrivalStatus: "",
    serviceType: "",
    tagName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 동적 콘텐츠 훅 사용
  const {
    isLoading: isContentLoading,
    getContentByKey,
    getImageByKey,
  } = useArrivalCheckinContent();

  // 로딩 중일 때는 로딩 표시
  if (isContentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">콘텐츠를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const isEarlyArrival = () => {
    return (
      formData.arrivalStatus === "thirtyMinBefore" ||
      formData.arrivalStatus === "tenMinBefore"
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 아직 도착 전이라면 확인 팝업 표시
    if (isEarlyArrival()) {
      const confirmed = window.confirm(
        getContentByKey("message_confirm", language)
      );
      if (!confirmed) {
        return;
      }
    }

    // 전송 진행
    await submitCheckin();
  };

  const submitCheckin = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/arrival-checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send checkin");
      }

      // 성공 메시지를 도착 상태에 따라 다르게 표시
      const successMessage = isEarlyArrival()
        ? getContentByKey("message_success_early", language)
        : getContentByKey("message_success", language);
      toast.success(successMessage);

      // 폼 초기화
      setFormData({
        name: "",
        terminal: "",
        arrivalStatus: "",
        serviceType: "",
        tagName: "",
      });
    } catch (error) {
      console.error("체크인 전송 실패:", error);
      toast.error(getContentByKey("message_error", language));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-4">
          {/* 언어 선택 */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-bold">
              {selectLanguageLabels[language]}
            </span>
            <Select
              value={language}
              onValueChange={(value: LanguageCode) => setLanguage(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CardTitle className="text-2xl font-bold">
            {getContentByKey("page_title", language)}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 설명 */}
          <div className="text-sm text-gray-700">
            <p className="mb-2">
              {getContentByKey("page_description", language)}
            </p>
            <p className="text-red-600 font-medium">
              {getContentByKey("foreigner_notice", language)}
            </p>
          </div>

          {/* 터미널 위치 정보 */}
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-xs bg-gray-200 rounded-lg shadow-md flex items-center justify-center mb-2 overflow-hidden">
                <Image
                  className="w-full object-contain"
                  src={
                    getImageByKey("terminal1_image")?.image_url ||
                    "/images/terminal1.png"
                  }
                  alt={
                    getImageByKey("terminal1_image")?.alt_text[language] ||
                    "Terminal 1"
                  }
                  width={320}
                  height={240}
                  key={
                    getImageByKey("terminal1_image")?.image_url ||
                    "default-terminal1"
                  }
                />
              </div>
              <span className="text-base font-semibold text-gray-700 text-center">
                {getContentByKey("terminal1_location", language)}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-full max-w-xs bg-gray-200 rounded-lg shadow-md flex items-center justify-center mb-2 overflow-hidden">
                <Image
                  className="w-full object-contain"
                  src={
                    getImageByKey("terminal2_image")?.image_url ||
                    "/images/terminal2.png"
                  }
                  alt={
                    getImageByKey("terminal2_image")?.alt_text[language] ||
                    "Terminal 2"
                  }
                  width={320}
                  height={180}
                  key={
                    getImageByKey("terminal2_image")?.image_url ||
                    "default-terminal2"
                  }
                />
              </div>
              <span className="text-base font-semibold text-gray-700 text-center">
                {getContentByKey("terminal2_location", language)}
              </span>
            </div>
          </div>

          {/* 서비스 타입 선택 */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "rentalReturn", contentKey: "service_rental_return" },
              { key: "rentalPickup", contentKey: "service_rental_pickup" },
              { key: "storageDropoff", contentKey: "service_storage_dropoff" },
              { key: "storagePickup", contentKey: "service_storage_pickup" },
            ].map(({ key, contentKey }) => (
              <Button
                key={key}
                type="button"
                variant={formData.serviceType === key ? "default" : "outline"}
                className={`border-green-500 ${
                  formData.serviceType === key
                    ? "bg-green-500 text-white"
                    : "text-green-700 hover:bg-green-100"
                }`}
                onClick={() => setFormData({ ...formData, serviceType: key })}
              >
                {getContentByKey(contentKey, language)}
              </Button>
            ))}
          </div>

          {/* 체크인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                {getContentByKey("label_name", language)}
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={getContentByKey("placeholder_name", language)}
                required
                className="mt-1"
              />
            </div>

            {/* 태그 이름 (짐보관-찾기인 경우에만 표시) */}
            {formData.serviceType === "storagePickup" && (
              <div>
                <Label htmlFor="tagName" className="text-sm font-medium">
                  {getContentByKey("label_tag_name", language)}
                </Label>
                <Input
                  id="tagName"
                  type="text"
                  value={formData.tagName}
                  onChange={(e) =>
                    setFormData({ ...formData, tagName: e.target.value })
                  }
                  placeholder={getContentByKey(
                    "placeholder_tag_name",
                    language
                  )}
                  required
                  className="mt-1"
                />
              </div>
            )}

            {/* 터미널 선택 */}
            <div>
              <Label htmlFor="terminal" className="text-sm font-medium">
                {getContentByKey("label_terminal", language)}
              </Label>
              <Select
                value={formData.terminal}
                onValueChange={(value) =>
                  setFormData({ ...formData, terminal: value })
                }
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={getContentByKey("label_terminal", language)}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terminal1">
                    {getContentByKey("terminal1_name", language)}
                  </SelectItem>
                  <SelectItem value="terminal2">
                    {getContentByKey("terminal2_name", language)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 도착 상태 */}
            <div>
              <Label htmlFor="arrivalStatus" className="text-sm font-medium">
                {getContentByKey("label_arrival_status", language)}
              </Label>
              <Select
                value={formData.arrivalStatus}
                onValueChange={(value) =>
                  setFormData({ ...formData, arrivalStatus: value })
                }
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={getContentByKey(
                      "placeholder_arrival_status",
                      language
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thirtyMinBefore">
                    {getContentByKey("arrival_thirty_min", language)}
                  </SelectItem>
                  <SelectItem value="tenMinBefore">
                    {getContentByKey("arrival_ten_min", language)}
                  </SelectItem>
                  <SelectItem value="atCounter">
                    {getContentByKey("arrival_at_counter", language)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 전송 버튼 */}
            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? getContentByKey("button_sending", language)
                : getContentByKey("button_submit", language)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
