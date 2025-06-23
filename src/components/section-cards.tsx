import { Calendar, Package, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

interface RentalItem {
  quantity: number;
  devices: {
    device_name: string;
    category: string;
  } | null;
}

interface RentalReservation {
  id: string;
  reservation_id: string;
  customer_name: string;
  customer_phone: string;
  rental_date: string;
  return_date: string;
  status: string;
  special_notes?: string;
  rental_items: RentalItem[];
}

interface StorageReservation {
  id: string;
  reservation_id: string;
  customer_name: string;
  customer_phone: string;
  storage_date: string;
  pickup_date: string;
  terminal: string;
  status: string;
  items_description?: string;
  special_notes?: string;
  tags?: string[];
}

const getOutgoingReservations = async () => {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  // 오늘 출고 예정인 렌탈 예약들
  const { data: rentalReservations } = await supabase
    .from("rental_reservations")
    .select(
      `
      *,
      rental_items (
        quantity,
        devices (device_name, category)
      )
    `
    )
    .eq("rental_date", today)
    .in("status", ["confirmed", "pending"])
    .order("created_at", { ascending: false })
    .limit(4);

  // 오늘 보관 입고 예정인 보관 예약들
  const { data: storageReservations } = await supabase
    .from("storage_reservations")
    .select("*")
    .eq("storage_date", today)
    .in("status", ["confirmed", "pending"])
    .order("created_at", { ascending: false })
    .limit(4);

  return {
    rentals: (rentalReservations || []) as RentalReservation[],
    storages: (storageReservations || []) as StorageReservation[],
  };
};

export async function SectionCards() {
  const { rentals, storages } = await getOutgoingReservations();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="default" className="text-xs">
            확정
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="text-xs">
            대기
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  const formatDeviceList = (items: RentalItem[]) => {
    if (!items || items.length === 0) return "품목 없음";

    const deviceGroups = items.reduce((acc: Record<string, number>, item) => {
      const deviceName = item.devices?.device_name || "알 수 없는 기기";
      if (acc[deviceName]) {
        acc[deviceName] += item.quantity;
      } else {
        acc[deviceName] = item.quantity;
      }
      return acc;
    }, {});

    return Object.entries(deviceGroups)
      .map(([name, count]) => `${name} x${count}`)
      .join(", ");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 px-4 lg:px-6">
      {/* 오늘 출고 예정 렌탈 카드들 */}
      {rentals.slice(0, 2).map((rental: RentalReservation) => (
        <Card
          key={rental.id}
          className="shadow-sm border-l-4 border-l-blue-500"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1 text-xs">
                <Package className="size-3" />
                렌탈 출고 예정
              </CardDescription>
              {getStatusBadge(rental.status)}
            </div>
            <CardTitle className="text-lg font-semibold text-blue-700">
              {rental.reservation_id}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="size-3 text-muted-foreground" />
              <span className="font-medium">{rental.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-3" />
              <span>{rental.customer_phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-3" />
              <span>
                {new Date(rental.return_date).toLocaleDateString("ko-KR")} 반납
              </span>
            </div>
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <div className="font-medium text-gray-700 mb-1">출고 품목:</div>
              <div className="text-gray-600 line-clamp-2">
                {formatDeviceList(rental.rental_items)}
              </div>
            </div>
            {rental.special_notes && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                특이사항: {rental.special_notes}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* 오늘 보관 입고 예정 카드들 */}
      {storages.slice(0, 2).map((storage: StorageReservation) => (
        <Card
          key={storage.id}
          className="shadow-sm border-l-4 border-l-green-500"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1 text-xs">
                <Package className="size-3" />
                보관 입고 예정
              </CardDescription>
              {getStatusBadge(storage.status)}
            </div>
            <CardTitle className="text-lg font-semibold text-green-700">
              {storage.reservation_id}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="size-3 text-muted-foreground" />
              <span className="font-medium">{storage.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-3" />
              <span>{storage.customer_phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-3" />
              <span>
                {new Date(storage.pickup_date).toLocaleDateString("ko-KR")} 수령
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                {storage.terminal}
              </Badge>
            </div>
            {storage.items_description && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <div className="font-medium text-gray-700 mb-1">보관 물품:</div>
                <div className="text-gray-600 line-clamp-2">
                  {storage.items_description}
                </div>
              </div>
            )}
            {storage.tags && storage.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {storage.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {storage.special_notes && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                특이사항: {storage.special_notes}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* 빈 카드들 채우기 (4개 미만일 때) */}
      {[...rentals, ...storages].length < 4 &&
        Array.from({ length: 4 - [...rentals, ...storages].length }).map(
          (_, index) => (
            <Card
              key={`empty-${index}`}
              className="shadow-sm border-dashed border-2 border-gray-200"
            >
              <CardHeader>
                <CardDescription className="text-center text-gray-400">
                  오늘 예정된 작업이 없습니다
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-32">
                <Package className="size-8 text-gray-300" />
              </CardContent>
            </Card>
          )
        )}
    </div>
  );
}
