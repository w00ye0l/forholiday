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

// 언어별 번역
const translations = {
  ko: {
    selectLanguage: "언어 선택",
    title: "도착 체크인",
    description:
      "공항 도착 후, 이름과 터미널 위치를 입력해 주시면 직원이 빠르게 준비하여 찾아뵙겠습니다.",
    foreignerNotice: "※ 외국인 고객님은 이름을 영문으로 기입해 주세요 ※",
    terminal1Location: "제 1터미널: 3층 14번 출구 안쪽 만남의 장소",
    terminal2Location: "제 2터미널: 3층 9번 출구, J카운터 맞은편 수하물정리대",
    serviceTypes: {
      rentalReturn: "대여 - 반납",
      rentalPickup: "대여 - 수령",
      storageDropoff: "짐보관 - 맡기기",
      storagePickup: "짐보관 - 찾기",
    },
    name: "이름",
    tagName: "짐 태그 번호",
    tagNamePlaceholder: "짐 태그 번호를 입력하세요",
    selectTerminal: "터미널을 선택하세요",
    terminal1: "제 1터미널",
    terminal2: "제 2터미널",
    arrivalStatus: "도착 상태",
    arrivalStatusPlaceholder: "--- 도착 상태 ---",
    arrivalOptions: {
      thirtyMinBefore: "도착 30분 전(예정)",
      tenMinBefore: "도착 10분 전(예정)",
      atCounter: "카운터 도착",
    },
    submit: "전송",
    sending: "전송 중...",
    success: "체크인이 완료되었습니다. 직원이 곧 찾아뵙겠습니다!",
    error: "전송에 실패했습니다. 다시 시도해주세요.",
  },
  en: {
    selectLanguage: "Select Language",
    title: "Arrival Check-in",
    description:
      "After arriving at the airport, please enter your name and terminal location. Our staff will quickly prepare and meet you.",
    foreignerNotice: "※ Foreign customers, please write your name in English ※",
    terminal1Location: "Terminal 1: 3F Exit 14, Inside Meeting Point",
    terminal2Location:
      "Terminal 2: 3F Exit 9, Baggage Arrangement Area opposite J Counter",
    serviceTypes: {
      rentalReturn: "Rental - Return",
      rentalPickup: "Rental - Pickup",
      storageDropoff: "Storage - Drop-off",
      storagePickup: "Storage - Pickup",
    },
    name: "Name",
    tagName: "Luggage Tag Number",
    tagNamePlaceholder: "Please enter luggage tag number",
    selectTerminal: "Please select terminal",
    terminal1: "Terminal 1",
    terminal2: "Terminal 2",
    arrivalStatus: "Arrival Status",
    arrivalStatusPlaceholder: "--- Select Arrival Status ---",
    arrivalOptions: {
      thirtyMinBefore: "30 minutes before arrival (scheduled)",
      tenMinBefore: "10 minutes before arrival (scheduled)",
      atCounter: "Arrived at counter",
    },
    submit: "Submit",
    sending: "Sending...",
    success: "Check-in completed. Our staff will meet you soon!",
    error: "Failed to send. Please try again.",
  },
  ja: {
    selectLanguage: "言語選択",
    title: "到着チェックイン",
    description:
      "空港到着後、お名前とターミナル位置を入力していただければ、スタッフが迅速に準備してお会いいたします。",
    foreignerNotice: "※ 外国人のお客様はお名前を英語でご記入ください ※",
    terminal1Location: "第1ターミナル：3階14番出口内側待ち合わせ場所",
    terminal2Location: "第2ターミナル：3階9番出口、Jカウンター向かい荷物整理台",
    serviceTypes: {
      rentalReturn: "レンタル - 返却",
      rentalPickup: "レンタル - 受取",
      storageDropoff: "荷物保管 - 預ける",
      storagePickup: "荷物保管 - 受取",
    },
    name: "お名前",
    tagName: "荷物タグ番号",
    tagNamePlaceholder: "荷物タグ番号を入力してください",
    selectTerminal: "ターミナルを選択してください",
    terminal1: "第1ターミナル",
    terminal2: "第2ターミナル",
    arrivalStatus: "到着状況",
    arrivalStatusPlaceholder: "--- 到着状況 ---",
    arrivalOptions: {
      thirtyMinBefore: "到着30分前（予定）",
      tenMinBefore: "到着10分前（予定）",
      atCounter: "カウンター到着",
    },
    submit: "送信",
    sending: "送信中...",
    success: "チェックインが完了しました。スタッフがすぐにお会いいたします！",
    error: "送信に失敗しました。もう一度お試しください。",
  },
};

type LanguageCode = keyof typeof translations;

const languages = [
  { code: "ko" as LanguageCode, name: "한국어" },
  { code: "en" as LanguageCode, name: "English" },
  { code: "ja" as LanguageCode, name: "日本語" },
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

  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      toast.success(t.success);

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
      toast.error(t.error);
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
            <span className="text-lg font-bold">{t.selectLanguage}</span>
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value as LanguageCode)}
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

          <CardTitle className="text-2xl font-bold">{t.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 설명 */}
          <div className="text-sm text-gray-700">
            <p className="mb-2">{t.description}</p>
            <p className="text-red-600 font-medium">{t.foreignerNotice}</p>
          </div>

          {/* 터미널 위치 정보 */}
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-xs bg-gray-200 rounded-lg shadow-md flex items-center justify-center mb-2 overflow-hidden">
                {/* <span className="text-gray-500">Terminal 1 Image</span> */}
                <Image
                  className="w-full object-contain"
                  src="/images/terminal1.png"
                  alt="Terminal 1"
                  width={320}
                  height={240}
                />
              </div>
              <span className="text-base font-semibold text-gray-700 text-center">
                {t.terminal1Location}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-full max-w-xs bg-gray-200 rounded-lg shadow-md flex items-center justify-center mb-2 overflow-hidden">
                <Image
                  className="w-full object-contain"
                  src="/images/terminal2.png"
                  alt="Terminal 2"
                  width={320}
                  height={180}
                />
              </div>
              <span className="text-base font-semibold text-gray-700 text-center">
                {t.terminal2Location}
              </span>
            </div>
          </div>

          {/* 서비스 타입 선택 */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(t.serviceTypes).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                variant={formData.serviceType === key ? "default" : "outline"}
                className={`border-green-500 ${
                  formData.serviceType === key
                    ? "bg-green-500 text-white"
                    : "text-green-500 hover:bg-green-50"
                }`}
                onClick={() => setFormData({ ...formData, serviceType: key })}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* 체크인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                {t.name}
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="mt-1"
              />
            </div>

            {/* 태그 이름 (짐보관-찾기인 경우에만 표시) */}
            {formData.serviceType === "storagePickup" && (
              <div>
                <Label htmlFor="tagName" className="text-sm font-medium">
                  {t.tagName}
                </Label>
                <Input
                  id="tagName"
                  type="text"
                  value={formData.tagName}
                  onChange={(e) =>
                    setFormData({ ...formData, tagName: e.target.value })
                  }
                  placeholder={t.tagNamePlaceholder}
                  required
                  className="mt-1"
                />
              </div>
            )}

            {/* 터미널 선택 */}
            <div>
              <Label htmlFor="terminal" className="text-sm font-medium">
                {t.selectTerminal}
              </Label>
              <Select
                value={formData.terminal}
                onValueChange={(value) =>
                  setFormData({ ...formData, terminal: value })
                }
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t.selectTerminal} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terminal1">{t.terminal1}</SelectItem>
                  <SelectItem value="terminal2">{t.terminal2}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 도착 상태 */}
            <div>
              <Label htmlFor="arrivalStatus" className="text-sm font-medium">
                {t.arrivalStatus}
              </Label>
              <Select
                value={formData.arrivalStatus}
                onValueChange={(value) =>
                  setFormData({ ...formData, arrivalStatus: value })
                }
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t.arrivalStatusPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thirtyMinBefore">
                    {t.arrivalOptions.thirtyMinBefore}
                  </SelectItem>
                  <SelectItem value="tenMinBefore">
                    {t.arrivalOptions.tenMinBefore}
                  </SelectItem>
                  <SelectItem value="atCounter">
                    {t.arrivalOptions.atCounter}
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
              {isSubmitting ? t.sending : t.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
