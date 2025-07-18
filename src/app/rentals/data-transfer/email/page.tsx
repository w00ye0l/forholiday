"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DataTransfer } from "@/types/rental";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export default function EmailSendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [transfers, setTransfers] = useState<DataTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // 이메일 폼 상태
  const [emailSubject, setEmailSubject] = useState("포할리데이 - 데이터 전송 완료 안내");
  const [emailContent, setEmailContent] = useState(`안녕하세요,

포할리데이를 이용해주셔서 감사합니다.

요청하신 데이터 전송이 완료되어 안내드립니다.
아래 링크를 통해 데이터를 다운로드 받으실 수 있습니다.

[다운로드 링크는 여기에 포함됩니다]

데이터는 7일간 다운로드 가능하며, 이후 자동으로 삭제됩니다.
문의사항이 있으시면 언제든 연락주세요.

감사합니다.

포할리데이 팀`);

  useEffect(() => {
    const transferIds = searchParams.get('transfers');
    if (!transferIds) {
      toast.error("선택된 항목이 없습니다.");
      router.push('/rentals/data-transfer');
      return;
    }
    
    fetchTransfers(transferIds.split(','));
  }, [searchParams]);

  const fetchTransfers = async (transferIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("data_transfers")
        .select(`
          *,
          rental:rental_reservations (
            renter_name,
            renter_phone,
            renter_email,
            device_category,
            device_tag_name,
            return_date,
            description
          )
        `)
        .in('id', transferIds)
        .eq('status', 'UPLOADED');

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setSending(true);
    try {
      // 각 이메일을 개별적으로 전송
      const emailPromises = transfers.map(async (transfer) => {
        if (!transfer.rental?.renter_email) {
          console.warn(`Transfer ${transfer.id} has no email address`);
          return { success: false, transferId: transfer.id, error: "이메일 주소 없음" };
        }

        try {
          // 실제 이메일 발송 API 호출
          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: transfer.rental.renter_email,
              subject: emailSubject,
              content: emailContent,
              transferId: transfer.id,
            }),
          });

          const emailResult = await emailResponse.json();

          if (!emailResult.success) {
            throw new Error(emailResult.error || 'Email sending failed');
          }

          // 이메일 발송 성공 시 데이터베이스 상태 업데이트
          const { error: updateError } = await supabase
            .from("data_transfers")
            .update({
              status: "EMAIL_SENT",
              email_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", transfer.id);

          if (updateError) throw updateError;

          return { success: true, transferId: transfer.id, messageId: emailResult.messageId };
        } catch (error) {
          console.error(`Error sending email for transfer ${transfer.id}:`, error);
          return { success: false, transferId: transfer.id, error: error instanceof Error ? error.message : String(error) };
        }
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`${successCount}개의 이메일이 성공적으로 발송되었습니다.`);
      }
      
      if (failCount > 0) {
        toast.error(`${failCount}개의 이메일 발송에 실패했습니다.`);
      }

      // 성공한 경우 이전 페이지로 돌아가기
      if (successCount > 0) {
        setTimeout(() => {
          router.push('/rentals/data-transfer');
        }, 2000);
      }
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      toast.error("이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>
        <h1 className="text-2xl font-bold mb-2">이메일 발송</h1>
        <p className="text-gray-600">
          {transfers.length}개의 고객에게 데이터 전송 완료 이메일을 발송합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 이메일 편집 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>이메일 내용 편집</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">제목</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="이메일 제목을 입력하세요"
              />
            </div>
            
            <div>
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="이메일 내용을 입력하세요"
                rows={15}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleSendEmails}
              disabled={sending || transfers.length === 0}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "발송 중..." : `${transfers.length}명에게 이메일 발송`}
            </Button>
          </CardContent>
        </Card>

        {/* 수신자 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>수신자 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="p-3 border rounded-lg bg-gray-50"
                >
                  <div className="font-medium text-sm">
                    {transfer.rental?.renter_name || "이름 없음"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {transfer.rental?.renter_email || "이메일 없음"}
                  </div>
                  <div className="text-xs text-gray-500">
                    기기: {transfer.rental?.device_tag_name || transfer.rental?.device_category || "-"}
                  </div>
                </div>
              ))}
            </div>
            
            {transfers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                발송할 이메일이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}