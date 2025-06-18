import { RentalList } from "@/components/rental/RentalList";
import { createClient } from "@/lib/supabase/server";

export default async function RentalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    // 예약 목록 조회
    const { data: rentals, error: rentalsError } = await supabase
      .from("rental_reservations")
      .select("*")
      .order("created_at", { ascending: false });

    if (rentalsError) {
      throw rentalsError;
    }

    // 기기 목록 조회
    const { data: devices, error: devicesError } = await supabase
      .from("devices")
      .select("id, tag_name, category, status");

    if (devicesError) {
      throw devicesError;
    }

    // 예약과 기기 정보를 매칭
    const rentalsWithDevices =
      rentals?.map((rental) => {
        const device = devices?.find((d) => d.tag_name === rental.tag_name);
        return {
          ...rental,
          devices: device || {
            id: "",
            tag_name: rental.tag_name,
            category: "알 수 없음",
            status: "unknown",
          },
        };
      }) || [];

    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">예약 목록</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          {rentalsWithDevices.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              예약된 기기가 없습니다.
            </div>
          ) : (
            <RentalList rentals={rentalsWithDevices} />
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("예약 목록 조회 에러:", error);

    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">예약 목록</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-red-500 p-4 border border-red-300 rounded">
            예약 목록을 불러오는데 실패했습니다.
          </div>
        </div>
      </div>
    );
  }
}
