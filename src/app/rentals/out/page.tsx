import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { RentalList } from "@/components/rental/RentalList";

export default async function RentalOutPage() {
  const supabase = createServerComponentClient({ cookies });

  // 대여 중인 예약 목록 조회
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
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">출고 관리</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <RentalList rentals={rentals || []} />
      </div>
    </div>
  );
}
