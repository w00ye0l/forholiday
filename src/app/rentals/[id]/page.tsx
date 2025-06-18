"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RentalReservation } from "@/types/rental";

interface RentalDetail extends RentalReservation {
  devices: {
    id: string;
    tag_name: string;
    category: string;
    status: string;
  };
}

const statusMap = {
  pending: { label: "대기중", variant: "secondary" },
  confirmed: { label: "확정됨", variant: "default" },
  in_progress: { label: "진행중", variant: "primary" },
  completed: { label: "완료됨", variant: "success" },
  cancelled: { label: "취소됨", variant: "destructive" },
  overdue: { label: "연체", variant: "warning" },
} as const;

const PICKUP_METHOD_LABELS = {
  T1: "터미널1",
  T2: "터미널2",
  delivery: "택배",
  office: "사무실",
  direct: "대면",
} as const;

const RETURN_METHOD_LABELS = {
  T1: "터미널1",
  T2: "터미널2",
  delivery: "택배",
  office: "사무실",
  direct: "대면",
} as const;

const RESERVATION_SITE_LABELS = {
  naver: "네이버",
  forholiday: "포할리데이 홈페이지",
  creatrip: "Creatrip",
  klook: "Klook",
  seoulpass: "Seoulpass",
  trip_com: "Trip.com",
  rakuten: "Rakuten",
  triple: "Triple",
  forholidayg: "forholidayg.com",
  myrealtrip: "마이리얼트립",
  waug: "와그",
  hanatour: "하나투어",
} as const;

export default function RentalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [rental, setRental] = useState<RentalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // 기기 정보 조회
        const { data: device, error: deviceError } = await supabase
          .from("devices")
          .select("id, tag_name, category, status")
          .eq("tag_name", rental.tag_name)
          .single();

        if (deviceError) {
          console.warn("기기 정보 조회 실패:", deviceError);
        }

        // 예약과 기기 정보 조합
        const rentalWithDevice = {
          ...rental,
          devices: device || {
            id: "",
            tag_name: rental.tag_name,
            category: "알 수 없음",
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
        <h1 className="text-2xl font-bold text-teal-600">예약 상세 정보</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
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
                  {rental.devices.category}
                </td>
              </tr>
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
                  {rental.renter_phone}
                </td>
              </tr>
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
                  {rental.pickup_date} 오후 {rental.pickup_time}
                </td>
              </tr>
              <tr className="border-b">
                <td className="bg-gray-100 px-4 py-3 font-medium text-gray-900">
                  반납일
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {rental.return_date} 오후 {rental.return_time}
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
                  <Badge variant={statusMap[rental.status].variant as any}>
                    {statusMap[rental.status].label}
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

        <div className="p-6 border-t bg-gray-50">
          <div className="flex gap-4">
            <Button variant="default" className="bg-teal-600 hover:bg-teal-700">
              수정
            </Button>
            <Button variant="outline">삭제</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
