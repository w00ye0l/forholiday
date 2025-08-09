"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EmailSendButtonProps {
  reservationId: string;
  customerName: string;
  defaultEmail?: string;
  emailSent?: boolean;
  onEmailSent?: () => void;
}

export default function EmailSendButton({
  reservationId,
  customerName,
  defaultEmail = "",
  emailSent = false,
  onEmailSent,
}: EmailSendButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);

  const handleSendEmail = async () => {
    if (!email || !email.includes("@")) {
      toast.error("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      formData.append('to', email);
      formData.append('subject', ''); // 템플릿에서 자동 생성됨
      formData.append('content', ''); // 템플릿에서 자동 생성됨
      formData.append('transferId', reservationId);
      formData.append('templateType', 'storage-confirmation');
      formData.append('reservationId', reservationId);

      const response = await fetch("/api/send-email", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("예약 확정 메일이 발송되었습니다.");
        setOpen(false);
        onEmailSent?.(); // 부모 컴포넌트에 상태 변경 알림
      } else {
        toast.error(data.error || "메일 발송에 실패했습니다.");
      }
    } catch (error) {
      console.error("Email sending error:", error);
      toast.error("메일 발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={emailSent ? "secondary" : "outline"} 
          size="sm"
          disabled={emailSent}
        >
          <Mail className="h-4 w-4 mr-2" />
          {emailSent ? "메일 전송완료" : "확정 메일 발송"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>예약 확정 메일 발송</DialogTitle>
          <DialogDescription>
            {customerName}님께 짐보관 예약 확정 메일을 발송합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reservation" className="text-right">
              예약번호
            </Label>
            <Input
              id="reservation"
              value={reservationId}
              className="col-span-3"
              disabled
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              이메일
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            취소
          </Button>
          <Button onClick={handleSendEmail} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                메일 발송
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}