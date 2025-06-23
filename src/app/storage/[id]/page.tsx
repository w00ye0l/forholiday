import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  StorageReservation,
  STORAGE_STATUS_LABELS,
  RESERVATION_SITE_LABELS,
} from "@/types/storage";
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  Clock,
  Package,
  Hash,
  FileText,
  Globe,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getStorage(id: string): Promise<StorageReservation | null> {
  const supabase = await createClient();
  const { data: storage, error } = await supabase
    .from("storage_reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !storage) {
    return null;
  }

  return storage;
}

// 캐싱 비활성화
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StorageDetailPage({ params }: PageProps) {
  const { id } = await params;
  const storage = await getStorage(id);

  if (!storage) {
    notFound();
  }

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

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/storage" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            보관 관리로 돌아가기
          </Link>
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">보관 예약 상세정보</h1>
            <p className="text-gray-600 mt-2">
              예약번호: {storage.reservation_id}
            </p>
          </div>
          <Badge
            variant={getStatusBadgeVariant(storage.status)}
            className="text-sm"
          >
            {STORAGE_STATUS_LABELS[storage.status]}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 고객 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              고객 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">고객명</p>
                <p className="font-medium">{storage.customer_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">연락처</p>
                <p className="font-medium">{storage.phone_number}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 예약 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              예약 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">맡기는 일시</p>
                <p className="font-medium">
                  {formatDateTime(storage.drop_off_date, storage.drop_off_time)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">찾아가는 일시</p>
                <p className="font-medium">
                  {formatDateTime(storage.pickup_date, storage.pickup_time)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">예약 사이트</p>
                <p className="font-medium">
                  {RESERVATION_SITE_LABELS[
                    storage.reservation_site as keyof typeof RESERVATION_SITE_LABELS
                  ] || storage.reservation_site}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 물품 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              물품 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Package className="w-4 h-4 text-gray-500 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">물품 내용</p>
                <p className="font-medium whitespace-pre-wrap">
                  {storage.items_description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">수량</p>
                <p className="font-medium">{storage.quantity}개</p>
              </div>
            </div>
            {storage.tag_number && (
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">태그 번호</p>
                  <p className="font-medium">{storage.tag_number}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              추가 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {storage.notes ? (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-gray-500 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">비고</p>
                  <p className="font-medium whitespace-pre-wrap">
                    {storage.notes}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">추가 정보 없음</p>
            )}

            <Separator />

            <div className="text-xs text-gray-500 space-y-1">
              <p>
                생성일: {new Date(storage.created_at).toLocaleString("ko-KR")}
              </p>
              <p>
                수정일: {new Date(storage.updated_at).toLocaleString("ko-KR")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 액션 버튼 */}
      <div className="mt-8 flex justify-center">
        <Button asChild>
          <Link href={`/storage/edit/${storage.id}`}>수정하기</Link>
        </Button>
      </div>
    </main>
  );
}
