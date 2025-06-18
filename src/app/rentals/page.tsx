import { RentalList } from "@/components/rental/RentalList";
import { createClient } from "@/lib/supabase/server";

export default async function RentalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // console.log("RentalsPage server user:", { user });

  // 사용자의 예약 목록 조회
  const { data: rentals } = await supabase
    .from("rental_reservations")
    .select(
      `
      *,
      devices (
        id,
        tag_name,
        category,
        status
      )
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">예약 목록</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <RentalList rentals={rentals || []} />
      </div>
    </div>
  );
}
