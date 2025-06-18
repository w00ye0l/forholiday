import { OutgoingList } from "@/components/rental/OutgoingList";
import { createClient } from "@/lib/supabase/server";

export default async function RentalReturnPage() {
  const supabase = await createClient();

  // 반납 예정인 예약 목록 조회
  const { data: rentals } = await supabase
    .from("rental_reservations")
    .select("*")
    .in("status", ["picked_up", "not_picked_up"])
    .order("return_date", { ascending: true });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">반납 관리</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <OutgoingList rentals={rentals || []} devices={[]} />
      </div>
    </div>
  );
}
