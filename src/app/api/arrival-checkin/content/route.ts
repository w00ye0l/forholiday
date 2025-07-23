import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // 콘텐츠 데이터 조회 (공개 읽기 가능)
    const { data: contentData, error: contentError } = await supabase
      .from("arrival_checkin_content")
      .select("*")
      .order("key");

    // 테이블이 없는 경우 기본 데이터 반환
    if (contentError && contentError.message?.includes("does not exist")) {
      console.log("테이블이 존재하지 않습니다. 기본 데이터를 반환합니다.");
      return NextResponse.json({
        content: getDefaultContent(),
        images: getDefaultImages(),
        notice: "데이터베이스 테이블이 생성되지 않았습니다. migration19.sql을 실행해주세요."
      });
    }

    if (contentError) {
      console.error("콘텐츠 조회 실패:", contentError);
      return NextResponse.json({ error: "콘텐츠 조회에 실패했습니다" }, { status: 500 });
    }

    // 이미지 데이터 조회 (공개 읽기 가능)
    const { data: imageData, error: imageError } = await supabase
      .from("arrival_checkin_images")
      .select("*")
      .order("display_order");

    if (imageError && !imageError.message?.includes("does not exist")) {
      console.error("이미지 조회 실패:", imageError);
      return NextResponse.json({ error: "이미지 조회에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({
      content: contentData || getDefaultContent(),
      images: imageData || getDefaultImages()
    });

  } catch (error) {
    console.error("API 에러:", error);
    return NextResponse.json({ error: "서버 에러가 발생했습니다" }, { status: 500 });
  }
}

// 기본 콘텐츠 데이터 (테이블이 없을 때 사용)
function getDefaultContent() {
  return [
    { key: "page_title", content: { ko: "도착 체크인", en: "Arrival Check-in", ja: "到着チェックイン" }, content_type: "text" },
    { key: "page_description", content: { ko: "공항 도착 후, 이름과 터미널 위치를 입력해 주시면 직원이 빠르게 준비하여 찾아뵙겠습니다.", en: "After arriving at the airport, please enter your name and terminal location. Our staff will quickly prepare and meet you.", ja: "空港到着後、お名前とターミナル位置を入力していただければ、スタッフが迅速に準備してお会いいたします。" }, content_type: "text" },
    { key: "foreigner_notice", content: { ko: "※ 외국인 고객님은 이름을 영문으로 기입해 주세요 ※", en: "※ Foreign customers, please write your name in English ※", ja: "※ 外国人のお客様はお名前を英語でご記入ください ※" }, content_type: "text" },
    { key: "terminal1_location", content: { ko: "제 1터미널: 3층 14번 출구 안쪽 만남의 장소", en: "Terminal 1: 3F Exit 14, Inside Meeting Point", ja: "第1ターミナル：3階14番出口内側待ち合わせ場所" }, content_type: "text" },
    { key: "terminal2_location", content: { ko: "제 2터미널: 3층 9번 출구, J카운터 맞은편 수하물정리대", en: "Terminal 2: 3F Exit 9, Baggage Arrangement Area opposite J Counter", ja: "第2ターミナル：3階9番出口、Jカウンター向かい荷物整理台" }, content_type: "text" },
    { key: "service_rental_return", content: { ko: "대여 - 반납", en: "Rental - Return", ja: "レンタル - 返却" }, content_type: "text" },
    { key: "service_rental_pickup", content: { ko: "대여 - 수령", en: "Rental - Pickup", ja: "レンタル - 受取" }, content_type: "text" },
    { key: "service_storage_dropoff", content: { ko: "짐보관 - 맡기기", en: "Storage - Drop-off", ja: "荷物保管 - 預ける" }, content_type: "text" },
    { key: "service_storage_pickup", content: { ko: "짐보관 - 찾기", en: "Storage - Pickup", ja: "荷物保管 - 受取" }, content_type: "text" },
    { key: "label_name", content: { ko: "이름", en: "Name", ja: "お名前" }, content_type: "text" },
    { key: "label_tag_name", content: { ko: "짐 태그 번호", en: "Luggage Tag Number", ja: "荷物タグ番号" }, content_type: "text" },
    { key: "label_terminal", content: { ko: "터미널을 선택하세요", en: "Please select terminal", ja: "ターミナルを選択してください" }, content_type: "text" },
    { key: "label_arrival_status", content: { ko: "도착 상태", en: "Arrival Status", ja: "到着状況" }, content_type: "text" },
    { key: "placeholder_tag_name", content: { ko: "짐 태그 번호를 입력하세요", en: "Please enter luggage tag number", ja: "荷物タグ番号を入力してください" }, content_type: "text" },
    { key: "placeholder_arrival_status", content: { ko: "--- 도착 상태 ---", en: "--- Select Arrival Status ---", ja: "--- 到着状況 ---" }, content_type: "text" },
    { key: "terminal1_name", content: { ko: "제 1터미널", en: "Terminal 1", ja: "第1ターミナル" }, content_type: "text" },
    { key: "terminal2_name", content: { ko: "제 2터미널", en: "Terminal 2", ja: "第2ターミナル" }, content_type: "text" },
    { key: "arrival_thirty_min", content: { ko: "도착 30분 전(예정)", en: "30 minutes before arrival (scheduled)", ja: "到着30分前（予定）" }, content_type: "text" },
    { key: "arrival_ten_min", content: { ko: "도착 10분 전(예정)", en: "10 minutes before arrival (scheduled)", ja: "到着10分前（予定）" }, content_type: "text" },
    { key: "arrival_at_counter", content: { ko: "카운터 도착", en: "Arrived at counter", ja: "カウンター到着" }, content_type: "text" },
    { key: "button_submit", content: { ko: "전송", en: "Submit", ja: "送信" }, content_type: "text" },
    { key: "button_sending", content: { ko: "전송 중...", en: "Sending...", ja: "送信中..." }, content_type: "text" },
    { key: "message_success", content: { ko: "체크인이 완료되었습니다. 직원이 곧 찾아뵙겠습니다!", en: "Check-in completed. Our staff will meet you soon!", ja: "チェックインが完了しました。スタッフがすぐにお会いいたします！" }, content_type: "text" },
    { key: "message_success_early", content: { ko: "체크인이 완료되었습니다. 직원이 찾아가겠습니다. 2~3분 걸릴 수 있습니다!", en: "Check-in completed. Our staff will come to find you. It may take 2-3 minutes!", ja: "チェックインが完了しました。スタッフがお探しいたします。2〜3分かかる場合があります！" }, content_type: "text" },
    { key: "message_error", content: { ko: "전송에 실패했습니다. 다시 시도해주세요.", en: "Failed to send. Please try again.", ja: "送信に失敗しました。もう一度お試しください。" }, content_type: "text" },
    { key: "message_confirm", content: { ko: "아직 도착 전이라면 전송 시 혼선이 발생할 수 있습니다. 계속 하시겠습니까?", en: "If you haven't arrived yet, sending now may cause confusion. Do you want to continue?", ja: "まだ到着前の場合、送信時に混乱が生じる可能性があります。続行しますか？" }, content_type: "text" }
  ];
}

// 기본 이미지 데이터 (테이블이 없을 때 사용)
function getDefaultImages() {
  return [
    { key: "terminal1_image", image_url: "/images/terminal1.png", alt_text: { ko: "제 1터미널 위치", en: "Terminal 1 Location", ja: "第1ターミナル位置" }, display_order: 1 },
    { key: "terminal2_image", image_url: "/images/terminal2.png", alt_text: { ko: "제 2터미널 위치", en: "Terminal 2 Location", ja: "第2ターミナル位置" }, display_order: 2 }
  ];
}