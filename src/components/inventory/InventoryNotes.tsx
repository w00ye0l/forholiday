"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SaveIcon, EditIcon, CheckIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

interface InventoryNotesProps {
  className?: string;
}

export function InventoryNotes({ className }: InventoryNotesProps) {
  const [notes, setNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [updatedBy, setUpdatedBy] = useState<string>("");

  // 메모 데이터 로드
  const fetchNotes = async () => {
    try {
      const response = await fetch("/api/terminal-notes/inventory");
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || "");
        setLastUpdated(data.updated_at || "");
        setUpdatedBy(data.updated_by || "");
      }
    } catch (error) {
      console.error("메모 로드 실패:", error);
    }
  };

  // 메모 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/terminal-notes/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastUpdated(data.updated_at);
        setUpdatedBy(data.updated_by);
        setIsEditing(false);
        toast.success("메모가 저장되었습니다.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "메모 저장에 실패했습니다.";
        console.error("API 에러:", errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("메모 저장 실패:", error);
      toast.error("메모 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 수정 취소
  const handleCancel = () => {
    fetchNotes(); // 원래 데이터로 복원
    setIsEditing(false);
  };

  // 컴포넌트 마운트시 데이터 로드
  useEffect(() => {
    fetchNotes();
  }, []);

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold text-gray-900">
            재고 관리 특이사항
          </Label>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8"
              >
                <EditIcon className="w-4 h-4 mr-1" />
                수정
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8"
                  disabled={isSaving}
                >
                  <XIcon className="w-4 h-4 mr-1" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-8"
                >
                  {isSaving ? (
                    <>
                      <SaveIcon className="w-4 h-4 mr-1 animate-spin" />
                      저장중
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4 mr-1" />
                      저장
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 메모 입력/표시 영역 */}
        <div className="space-y-2">
          {isEditing ? (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="재고 관리와 관련된 특이사항을 입력하세요..."
              className="min-h-[120px] resize-none"
            />
          ) : (
            <div className="min-h-[120px] p-3 border rounded-md bg-gray-50">
              {notes ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                  {notes}
                </pre>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  메모가 없습니다. 수정 버튼을 클릭해서 추가하세요.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 마지막 수정 정보 */}
        {(lastUpdated || updatedBy) && (
          <div className="text-xs text-gray-500 flex justify-end">
            {lastUpdated && (
              <span>
                마지막 수정: {formatDate(lastUpdated)}
                {updatedBy && ` (by ${updatedBy})`}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}