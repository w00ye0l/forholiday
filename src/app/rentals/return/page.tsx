import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { RentalList } from "@/components/rental/RentalList";

export default async function RentalReturnPage() {
  const supabase = createServerComponentClient({ cookies });

  // 반납 예정인 예약 목록 조회
  const { data: rentals } = await supabase
    .from("rental_reservations")
    .select(
      `
      *,
      devices (
        id,
        name,
        model_number,
        status
      )
    `
    )
    .in("status", ["in_progress", "overdue"])
    .order("return_date", { ascending: true });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">반납 관리</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <RentalList rentals={rentals || []} />
      </div>
    </div>
  );
}
