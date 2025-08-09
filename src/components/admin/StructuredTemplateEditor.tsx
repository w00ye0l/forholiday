"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, LinkIcon, FileTextIcon } from "lucide-react";
import { EditableTemplateContent, TemplateEditConfig } from "@/types/email-template";
import { EmailTemplateParser } from "@/lib/template-parser";

interface Props {
  templateKey: string;
  htmlTemplate: string;
  onContentChange: (content: EditableTemplateContent) => void;
  editConfig: TemplateEditConfig | undefined;
}

export function StructuredTemplateEditor({
  templateKey,
  htmlTemplate,
  onContentChange,
  editConfig,
}: Props) {
  const [editableContent, setEditableContent] = useState<EditableTemplateContent>({});
  
  useEffect(() => {
    // HTML 템플릿에서 편집 가능한 내용 추출
    const parsed = EmailTemplateParser.parseEditableContent(templateKey, htmlTemplate);
    setEditableContent(parsed);
  }, [templateKey, htmlTemplate]);
  
  const handleFieldChange = (fieldKey: keyof EditableTemplateContent, value: any) => {
    const newContent = {
      ...editableContent,
      [fieldKey]: value,
    };
    setEditableContent(newContent);
    onContentChange(newContent);
  };
  
  const handleArrayFieldChange = (
    fieldKey: keyof EditableTemplateContent,
    index: number,
    value: string
  ) => {
    const currentArray = (editableContent[fieldKey] as string[]) || [];
    const newArray = [...currentArray];
    newArray[index] = value;
    handleFieldChange(fieldKey, newArray);
  };
  
  const addArrayItem = (fieldKey: keyof EditableTemplateContent) => {
    const currentArray = (editableContent[fieldKey] as string[]) || [];
    handleFieldChange(fieldKey, [...currentArray, ""]);
  };
  
  const removeArrayItem = (fieldKey: keyof EditableTemplateContent, index: number) => {
    const currentArray = (editableContent[fieldKey] as string[]) || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    handleFieldChange(fieldKey, newArray);
  };
  
  if (!editConfig) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">이 템플릿은 구조화된 편집을 지원하지 않습니다.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="h-5 w-5" />
          구조화된 내용 편집
          <Badge variant="secondary">{editConfig.template_name}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {editConfig.editable_fields.map((field) => {
          const currentValue = editableContent[field.field_key];
          
          return (
            <div key={field.field_key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={field.field_key}>{field.field_name}</Label>
                {field.required && (
                  <Badge variant="destructive" className="text-xs">
                    필수
                  </Badge>
                )}
                {field.field_type === "url" && (
                  <LinkIcon className="h-4 w-4 text-blue-500" />
                )}
              </div>
              
              {field.field_type === "text" && (
                <Input
                  id={field.field_key}
                  value={(currentValue as string) || ""}
                  onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={field.max_length}
                />
              )}
              
              {field.field_type === "textarea" && (
                <Textarea
                  id={field.field_key}
                  value={(currentValue as string) || ""}
                  onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  maxLength={field.max_length}
                />
              )}
              
              {field.field_type === "url" && (
                <div className="space-y-2">
                  <Input
                    id={field.field_key}
                    type="url"
                    value={(currentValue as string) || ""}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    placeholder={field.placeholder}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    변수를 사용할 수 있습니다: {"{{reservation_id}}"}
                  </p>
                </div>
              )}
              
              {field.field_type === "number" && (
                <Input
                  id={field.field_key}
                  type="number"
                  value={(currentValue as number) || ""}
                  onChange={(e) => handleFieldChange(field.field_key, parseInt(e.target.value) || 0)}
                  placeholder={field.placeholder}
                  min="1"
                  max="365"
                />
              )}
              
              {field.field_type === "array" && (
                <div className="space-y-3">
                  {((currentValue as string[]) || [""]).map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Textarea
                          value={item}
                          onChange={(e) =>
                            handleArrayFieldChange(field.field_key, index, e.target.value)
                          }
                          placeholder={field.placeholder}
                          rows={2}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem(field.field_key, index)}
                        disabled={((currentValue as string[]) || []).length <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem(field.field_key)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    항목 추가
                  </Button>
                </div>
              )}
              
              {field.max_length && field.field_type !== "number" && (
                <p className="text-xs text-gray-500">
                  {typeof currentValue === "string" ? currentValue.length : 0}/{field.max_length}자
                </p>
              )}
            </div>
          );
        })}
        
        {templateKey === "data-transfer-completion" && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 링크 및 첨부파일 기능</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 다운로드 링크를 입력하면 클릭 가능한 버튼이 생성됩니다</li>
              <li>• 변수 {"{{reservation_id}}"}, {"{{renter_name}}"} 등을 사용할 수 있습니다</li>
              <li>• 첨부파일 안내 텍스트로 파일 첨부 방법을 설명할 수 있습니다</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}