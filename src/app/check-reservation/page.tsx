"use client";

import { useState } from "react";
import { checkReservation } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchIcon,
  CalendarIcon,
  PhoneIcon,
  MapPinIcon,
  LanguagesIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import type { RentalReservation } from "@/types/rental";
import {
  DEVICE_CATEGORY_LABELS,
  DEVICE_CATEGORY_LABELS_EN,
} from "@/types/device";

// 언어별 번역
const translations = {
  ko: {
    // 페이지 제목 및 설명
    pageTitle: "예약 조회",
    pageDescription: "예약 번호와 전화번호를 입력하여 예약 내역을 확인하세요.",

    // 검색 폼
    searchFormTitle: "예약 정보 입력",
    reservationIdLabel: "예약 번호",
    reservationIdPlaceholder: "예약 번호를 입력하세요",
    phoneLabel: "전화번호",
    phonePlaceholder: "예약 시 입력한 전화번호를 입력하세요",
    searchButton: "예약 조회",
    searchingButton: "조회 중...",
    resetButton: "초기화",

    // 예약 정보 표시
    reservationInfo: "예약 정보",
    renterName: "예약자명",
    phone: "연락처",
    deviceInfo: "기기 정보",
    pickupInfo: "수령 정보",
    returnInfo: "반납 정보",
    additionalOptions: "추가 옵션",
    dataTransmission: "데이터 전송",
    sdCard: "SD카드",
    notes: "비고",
    reservationDate: "예약일시",

    // 상태 라벨
    statusLabels: {
      pending: "수령 전",
      picked_up: "수령 완료",
      not_picked_up: "미수령",
    },

    // 수령/반납 방법 라벨
    pickupMethodLabels: {
      T1: "터미널1",
      T2: "터미널2",
      delivery: "택배",
      office: "사무실",
      direct: "직접수령",
    },

    // 도움말
    helpText1: "예약 번호는 예약 확인 메일 또는 문자에서 확인하실 수 있습니다.",
    helpText2: "문의사항이 있으시면 고객센터로 연락해주세요.",

    // 언어
    language: "언어",
  },
  en: {
    // Page title and description
    pageTitle: "Check Reservation",
    pageDescription:
      "Enter your reservation number and phone number to check your reservation details.",

    // Search form
    searchFormTitle: "Enter Reservation Information",
    reservationIdLabel: "Reservation Number",
    reservationIdPlaceholder: "Enter your reservation number",
    phoneLabel: "Phone Number",
    phonePlaceholder: "Enter the phone number used for reservation",
    searchButton: "Search Reservation",
    searchingButton: "Searching...",
    resetButton: "Reset",

    // Reservation info display
    reservationInfo: "Reservation Information",
    renterName: "Customer Name",
    phone: "Phone",
    deviceInfo: "Device Information",
    pickupInfo: "Pickup Information",
    returnInfo: "Return Information",
    additionalOptions: "Additional Options",
    dataTransmission: "Data Transfer",
    sdCard: "SD Card",
    notes: "Notes",
    reservationDate: "Reserved On",

    // Status labels
    statusLabels: {
      pending: "Pending Pickup",
      picked_up: "Picked Up",
      not_picked_up: "Not Picked Up",
    },

    // Pickup/return method labels
    pickupMethodLabels: {
      T1: "Terminal 1",
      T2: "Terminal 2",
      delivery: "Delivery",
      office: "Office",
      direct: "Direct Pickup",
    },

    // Help text
    helpText1:
      "You can find your reservation number in the confirmation email or text message.",
    helpText2:
      "If you have any questions, please contact our customer service.",

    // Language
    language: "Language",
  },
};

export default function CheckReservationPage() {
  const [reservationId, setReservationId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reservation, setReservation] = useState<RentalReservation | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<"ko" | "en">("ko");

  // 현재 언어의 번역 가져오기
  const t = translations[language];

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setReservation(null);

    try {
      const result = await checkReservation(reservationId, phoneNumber);

      if (result.success && result.data) {
        setReservation(result.data);
      } else {
        setError(result.error || "예약 조회 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("예약 조회 오류:", err);
      setError("예약 조회 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setReservationId("");
    setPhoneNumber("");
    setReservation(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1" />
            <h1 className="text-2xl font-bold text-gray-900 flex-1">
              {t.pageTitle}
            </h1>
            <div className="flex-1 flex justify-end">
              <div className="flex items-center gap-2">
                <LanguagesIcon className="w-4 h-4 text-gray-600" />
                <Select
                  value={language}
                  onValueChange={(value: "ko" | "en") => setLanguage(value)}
                >
                  <SelectTrigger className="w-fit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <p className="text-gray-600">{t.pageDescription}</p>
        </div>

        {/* 검색 폼 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SearchIcon className="w-5 h-5" />
              {t.searchFormTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.reservationIdLabel}
              </label>
              <Input
                type="text"
                placeholder={t.reservationIdPlaceholder}
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                className="w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.phoneLabel}
              </label>
              <Input
                type="tel"
                placeholder={t.phonePlaceholder}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full text-sm"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="flex-1"
              >
                {loading ? t.searchingButton : t.searchButton}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={loading}
              >
                {t.resetButton}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 예약 정보 표시 */}
        {reservation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t.reservationInfo}</span>
                <Badge
                  variant={
                    reservation.status === "pending"
                      ? "secondary"
                      : reservation.status === "picked_up"
                      ? "default"
                      : "destructive"
                  }
                >
                  {t.statusLabels[reservation.status]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {t.renterName}
                  </label>
                  <p className="font-medium">{reservation.renter_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {t.phone}
                  </label>
                  <div className="flex items-center gap-1">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{reservation.renter_phone}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 기기 정보 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {t.deviceInfo}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-green-600">
                    {language === "ko"
                      ? DEVICE_CATEGORY_LABELS[reservation.device_category]
                      : DEVICE_CATEGORY_LABELS_EN[reservation.device_category]}
                  </span>
                  {reservation.device_tag_name && (
                    <span className="text-sm text-gray-600">
                      ({reservation.device_tag_name})
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              {/* 수령/반납 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    {t.pickupInfo}
                  </label>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm underline underline-offset-2 decoration-green-400 text-green-600 font-bold">
                        {format(
                          new Date(reservation.pickup_date),
                          language === "ko"
                            ? "yyyy년 MM월 dd일"
                            : "MMM dd, yyyy",
                          { locale: language === "ko" ? ko : enUS }
                        )}
                        {" / "}
                        {reservation.pickup_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {t.pickupMethodLabels[reservation.pickup_method]}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    {t.returnInfo}
                  </label>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm underline underline-offset-2 decoration-green-400 text-green-600 font-bold">
                        {format(
                          new Date(reservation.return_date),
                          language === "ko"
                            ? "yyyy년 MM월 dd일"
                            : "MMM dd, yyyy",
                          { locale: language === "ko" ? ko : enUS }
                        )}
                        {" / "}
                        {reservation.return_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {t.pickupMethodLabels[reservation.return_method]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 추가 옵션 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">
                  {t.additionalOptions}
                </label>
                <div className="flex flex-wrap gap-2">
                  {reservation.data_transmission && (
                    <Badge variant="secondary">{t.dataTransmission}</Badge>
                  )}
                  {reservation.sd_option && (
                    <Badge variant="secondary">
                      {t.sdCard} {reservation.sd_option}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 비고 */}
              {reservation.description && (
                <>
                  <Separator />
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      {t.notes}
                    </label>
                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                      {reservation.description}
                    </p>
                  </div>
                </>
              )}

              {/* 예약 일시 */}
              <Separator />
              <div className="text-xs text-gray-500">
                {t.reservationDate}:{" "}
                {format(
                  new Date(reservation.created_at),
                  language === "ko"
                    ? "yyyy년 MM월 dd일 HH:mm"
                    : "MMM dd, yyyy HH:mm",
                  { locale: language === "ko" ? ko : enUS }
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 도움말 */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>{t.helpText1}</p>
          <p>{t.helpText2}</p>
        </div>
      </div>
    </div>
  );
}
