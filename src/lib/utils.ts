import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  RentalReservation,
  PickupMethod,
  ReturnMethod,
  ReservationSite,
  ReservationStatus,
  STATUS_MAP,
  PICKUP_METHOD_LABELS,
  RETURN_METHOD_LABELS,
  RESERVATION_SITE_LABELS,
} from "@/types/rental";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 엑셀 출력 유틸리티 함수
export const exportToExcel = (
  data: any[],
  filename: string,
  options?: {
    sheetName?: string;
    includeStats?: boolean;
    statsData?: any;
  }
) => {
  try {
    // 새 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 메인 데이터 시트 생성
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 컬럼 너비 자동 조정
    const columnWidths = Object.keys(data[0] || {}).map((key) => ({
      wch:
        Math.max(
          key.length,
          ...data.map((row) => String(row[key] || "").length)
        ) + 2,
    }));
    worksheet["!cols"] = columnWidths;

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      options?.sheetName || "데이터"
    );

    // 통계 데이터가 있으면 별도 시트로 추가
    if (options?.includeStats && options?.statsData) {
      const statsWorksheet = XLSX.utils.json_to_sheet(options.statsData);
      XLSX.utils.book_append_sheet(workbook, statsWorksheet, "통계");
    }

    // 파일 다운로드
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss", { locale: ko });
    const finalFilename = `${filename}_${timestamp}.xlsx`;

    XLSX.writeFile(workbook, finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("엑셀 출력 에러:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
};

// 수령 방법 라벨 변환 (공항 표시를 위해 확장)
const getPickupMethodLabel = (method: PickupMethod): string => {
  const extendedLabels: Record<PickupMethod, string> = {
    T1: "인천공항 T1",
    T2: "인천공항 T2",
    delivery: "택배",
    office: "사무실",
    hotel: "호텔",
  };
  return extendedLabels[method] || PICKUP_METHOD_LABELS[method] || method;
};

// 반납 방법 라벨 변환 (공항 표시를 위해 확장)
const getReturnMethodLabel = (method: ReturnMethod): string => {
  const extendedLabels: Record<ReturnMethod, string> = {
    T1: "인천공항 T1",
    T2: "인천공항 T2",
    delivery: "택배",
    office: "사무실",
    hotel: "호텔",
  };
  return extendedLabels[method] || RETURN_METHOD_LABELS[method] || method;
};

// 예약 사이트 라벨 변환
const getReservationSiteLabel = (site: ReservationSite): string => {
  return RESERVATION_SITE_LABELS[site] || site;
};

// 예약 상태 라벨 변환
const getStatusLabel = (status: ReservationStatus): string => {
  return STATUS_MAP[status]?.label || status;
};

// 렌탈 데이터 엑셀 출력용 변환 함수
export const transformRentalDataForExcel = (rentals: RentalReservation[]) => {
  return rentals.map((rental, index) => ({
    순번: index + 1,
    예약번호: rental.reservation_id,
    고객명: rental.renter_name,
    연락처: rental.renter_phone,
    주소: rental.renter_address,
    기기명: rental.device_tag_name || "-",
    "기기 카테고리": rental.device_category,
    수령일: rental.pickup_date
      ? format(new Date(rental.pickup_date), "yyyy-MM-dd", { locale: ko })
      : "-",
    수령시간: rental.pickup_time || "-",
    반납일: rental.return_date
      ? format(new Date(rental.return_date), "yyyy-MM-dd", { locale: ko })
      : "-",
    반납시간: rental.return_time || "-",
    "수령 방법": getPickupMethodLabel(rental.pickup_method),
    "반납 방법": getReturnMethodLabel(rental.return_method),
    "데이터 전송": rental.data_transmission ? "예" : "아니오",
    "SD 옵션": rental.sd_option || "-",
    "예약 사이트": getReservationSiteLabel(rental.reservation_site),
    상태: getStatusLabel(rental.status),
    비고: rental.description || "-",
    생성일: rental.created_at
      ? format(new Date(rental.created_at), "yyyy-MM-dd HH:mm", { locale: ko })
      : "-",
    수정일: rental.updated_at
      ? format(new Date(rental.updated_at), "yyyy-MM-dd HH:mm", { locale: ko })
      : "-",
    취소일: rental.cancelled_at
      ? format(new Date(rental.cancelled_at), "yyyy-MM-dd HH:mm", {
          locale: ko,
        })
      : "-",
    "취소 사유": rental.cancel_reason || "-",
  }));
};

// 렌탈 통계 데이터 변환 함수
export const transformRentalStatsForExcel = (
  rentals: RentalReservation[],
  dateRange: string
) => {
  // 기기별 통계
  const deviceStats = new Map<string, number>();
  rentals.forEach((rental) => {
    const category = rental.device_category;
    deviceStats.set(category, (deviceStats.get(category) || 0) + 1);
  });

  const deviceStatsArray = Array.from(deviceStats.entries()).map(
    ([category, count]) => ({
      "기기 카테고리": category,
      건수: count,
      "비율(%)":
        rentals.length > 0 ? ((count / rentals.length) * 100).toFixed(1) : "0",
    })
  );

  // 수령 방법별 통계
  const pickupStats = new Map<string, number>();
  rentals.forEach((rental) => {
    const method = getPickupMethodLabel(rental.pickup_method);
    pickupStats.set(method, (pickupStats.get(method) || 0) + 1);
  });

  const pickupStatsArray = Array.from(pickupStats.entries()).map(
    ([method, count]) => ({
      "수령 방법": method,
      건수: count,
      "비율(%)":
        rentals.length > 0 ? ((count / rentals.length) * 100).toFixed(1) : "0",
    })
  );

  // 반납 방법별 통계
  const returnStats = new Map<string, number>();
  rentals.forEach((rental) => {
    const method = getReturnMethodLabel(rental.return_method);
    returnStats.set(method, (returnStats.get(method) || 0) + 1);
  });

  const returnStatsArray = Array.from(returnStats.entries()).map(
    ([method, count]) => ({
      "반납 방법": method,
      건수: count,
      "비율(%)":
        rentals.length > 0 ? ((count / rentals.length) * 100).toFixed(1) : "0",
    })
  );

  // 예약 사이트별 통계
  const siteStats = new Map<string, number>();
  rentals.forEach((rental) => {
    const site = getReservationSiteLabel(rental.reservation_site);
    siteStats.set(site, (siteStats.get(site) || 0) + 1);
  });

  const siteStatsArray = Array.from(siteStats.entries()).map(
    ([site, count]) => ({
      "예약 사이트": site,
      건수: count,
      "비율(%)":
        rentals.length > 0 ? ((count / rentals.length) * 100).toFixed(1) : "0",
    })
  );

  // 상태별 통계
  const statusCounts = {
    pending: rentals.filter((r) => r.status === "pending").length,
    picked_up: rentals.filter((r) => r.status === "picked_up").length,
    not_picked_up: rentals.filter((r) => r.status === "not_picked_up").length,
  };

  // 전체 통계
  const summary = [
    {
      구분: "전체 통계",
      "조회 기간": dateRange,
      "총 예약 건수": rentals.length,
      수령전: statusCounts.pending,
      수령완료: statusCounts.picked_up,
      미수령: statusCounts.not_picked_up,
      "데이터 전송 예": rentals.filter((r) => r.data_transmission).length,
      생성일: format(new Date(), "yyyy-MM-dd HH:mm", { locale: ko }),
    },
  ];

  return [
    ...summary,
    {
      구분: "",
      "조회 기간": "",
      "총 예약 건수": "",
      수령전: "",
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    },
    {
      구분: "기기별 통계",
      "조회 기간": "",
      "총 예약 건수": "",
      수령전: "",
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    },
    ...deviceStatsArray.map((item) => ({
      구분: item["기기 카테고리"],
      "조회 기간": "",
      "총 예약 건수": item["건수"],
      수령전: `${item["비율(%)"]}%`,
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    })),
    {
      구분: "",
      "조회 기간": "",
      "총 예약 건수": "",
      수령전: "",
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    },
    {
      구분: "수령 방법별 통계",
      "조회 기간": "",
      "총 예약 건수": "",
      수령전: "",
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    },
    ...pickupStatsArray.map((item) => ({
      구분: item["수령 방법"],
      "조회 기간": "",
      "총 예약 건수": item["건수"],
      수령전: `${item["비율(%)"]}%`,
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    })),
    {
      구분: "",
      "조회 기간": "",
      "총 예약 건수": "",
      수령전: "",
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    },
    {
      구분: "반납 방법별 통계",
      "조회 기간": "",
      "총 예약 건수": "",
      수령전: "",
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    },
    ...returnStatsArray.map((item) => ({
      구분: item["반납 방법"],
      "조회 기간": "",
      "총 예약 건수": item["건수"],
      수령전: `${item["비율(%)"]}%`,
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    })),
    {
      구분: "",
      "조회 기간": "",
      "총 예약 건수": "",
      수령전: "",
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    },
    {
      구분: "예약 사이트별 통계",
      "조회 기간": "",
      "총 예약 건수": "",
      수령전: "",
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    },
    ...siteStatsArray.map((item) => ({
      구분: item["예약 사이트"],
      "조회 기간": "",
      "총 예약 건수": item["건수"],
      수령전: `${item["비율(%)"]}%`,
      수령완료: "",
      미수령: "",
      "데이터 전송 예": "",
      생성일: "",
    })),
  ];
};
