"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Eye,
  Mail,
  RefreshCw,
  AlertCircle,
  Save,
  Settings,
} from "lucide-react";
import { StructuredTemplateEditor } from "@/components/admin/StructuredTemplateEditor";
import { EmailTemplateParser } from "@/lib/template-parser";
import { EditableTemplateContent } from "@/types/email-template";

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  subject_template: string;
  html_template: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 템플릿 카테고리 정의
const templateCategories = {
  storage: {
    key: "storage",
    name: "짐보관 관련",
    templates: ["storage-confirmation"],
  },
  rental: {
    key: "rental",
    name: "대여 관련",
    templates: ["data-transfer-completion"],
  },
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [tempTemplate, setTempTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("storage");
  const [structuredContent, setStructuredContent] =
    useState<EditableTemplateContent>({});
  const [editMode, setEditMode] = useState<"structured" | "raw">("structured");

  // 템플릿 목록 로드
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/email-templates");
      if (response.ok) {
        const data = await response.json();
        const templateList = data.templates || [];
        setTemplates(templateList);

        // 첫 번째 카테고리의 첫 번째 템플릿을 기본 선택
        const firstCategoryTemplates = templateList.filter((t: EmailTemplate) =>
          templateCategories.storage.templates.includes(t.template_key)
        );
        if (firstCategoryTemplates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(firstCategoryTemplates[0]);
          setTempTemplate({ ...firstCategoryTemplates[0] });
        }
      } else {
        console.error("Failed to load templates");
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 템플릿 저장
  const saveTemplate = async () => {
    if (!tempTemplate) return;

    setIsSaving(true);
    try {
      // 구조화된 편집 모드일 때는 구조화된 내용을 HTML로 렌더링
      let templateToSave = { ...tempTemplate };
      if (
        editMode === "structured" &&
        Object.keys(structuredContent).length > 0
      ) {
        templateToSave.html_template = EmailTemplateParser.renderTemplate(
          tempTemplate.template_key,
          selectedTemplate?.html_template || "",
          structuredContent
        );
      }

      const response = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateToSave),
      });

      if (response.ok) {
        await loadTemplates();
        setHasUnsavedChanges(false);
        console.log("Template saved successfully");
      } else {
        console.error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    if (hasUnsavedChanges) {
      if (
        !confirm(
          "저장되지 않은 변경사항이 있습니다. 다른 템플릿을 선택하시겠습니까?"
        )
      ) {
        return;
      }
    }

    setSelectedTemplate(template);
    setTempTemplate({ ...template });
    setHasUnsavedChanges(false);

    // 구조화된 내용 초기화
    const parsed = EmailTemplateParser.parseEditableContent(
      template.template_key,
      template.html_template
    );
    setStructuredContent(parsed);
  };

  const handleTemplateChange = (field: keyof EmailTemplate, value: any) => {
    if (!tempTemplate) return;

    setTempTemplate((prev) => ({
      ...prev!,
      [field]: value,
    }));
    setHasUnsavedChanges(true);
  };

  const handleCancel = () => {
    if (selectedTemplate) {
      setTempTemplate({ ...selectedTemplate });
      setHasUnsavedChanges(false);

      // 구조화된 내용 초기화
      const parsed = EmailTemplateParser.parseEditableContent(
        selectedTemplate.template_key,
        selectedTemplate.html_template
      );
      setStructuredContent(parsed);
    }
  };

  const getTemplatesByCategory = (categoryKey: string) => {
    const category = Object.values(templateCategories).find(
      (cat) => cat.key === categoryKey
    );
    if (!category) return [];

    return templates.filter((template) =>
      category.templates.includes(template.template_key)
    );
  };

  // 탭 변경 시 해당 카테고리의 첫 번째 템플릿 선택
  const handleTabChange = (value: string) => {
    if (hasUnsavedChanges) {
      if (
        !confirm("저장되지 않은 변경사항이 있습니다. 탭을 변경하시겠습니까?")
      ) {
        return;
      }
    }

    setActiveTab(value);

    // 해당 카테고리의 첫 번째 템플릿 선택
    const categoryTemplates = getTemplatesByCategory(value);
    if (categoryTemplates.length > 0) {
      const firstTemplate = categoryTemplates[0];
      setSelectedTemplate(firstTemplate);
      setTempTemplate({ ...firstTemplate });
      setHasUnsavedChanges(false);

      // 구조화된 내용 초기화
      const parsed = EmailTemplateParser.parseEditableContent(
        firstTemplate.template_key,
        firstTemplate.html_template
      );
      setStructuredContent(parsed);
    } else {
      setSelectedTemplate(null);
      setTempTemplate(null);
      setHasUnsavedChanges(false);
      setStructuredContent({});
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // 템플릿 목록이 로드된 후 탭에 맞는 템플릿 자동 선택
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const categoryTemplates = getTemplatesByCategory(activeTab);
      if (categoryTemplates.length > 0) {
        const firstTemplate = categoryTemplates[0];
        setSelectedTemplate(firstTemplate);
        setTempTemplate({ ...firstTemplate });

        // 구조화된 내용 초기화
        const parsed = EmailTemplateParser.parseEditableContent(
          firstTemplate.template_key,
          firstTemplate.html_template
        );
        setStructuredContent(parsed);
      }
    }
  }, [templates, activeTab]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">템플릿을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 max-w-7xl w-full">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">이메일 템플릿 관리</h1>
          <p className="text-gray-600 mt-1">
            시스템에서 사용되는 이메일 템플릿을 관리할 수 있습니다.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {hasUnsavedChanges && (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-800"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              저장되지 않은 변경사항
            </Badge>
          )}

          <Button
            onClick={loadTemplates}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>

          {hasUnsavedChanges && (
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSaving}
              className="text-gray-600 hover:text-gray-800"
            >
              취소
            </Button>
          )}

          <Button
            onClick={saveTemplate}
            disabled={isSaving || !hasUnsavedChanges}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            저장
          </Button>
        </div>
      </div>

      {/* 상단 - 템플릿 목록 (탭으로 구분) */}
      <Card className="mb-6 min-h-64">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            이메일 템플릿 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="storage">짐보관</TabsTrigger>
              <TabsTrigger value="rental">데이터</TabsTrigger>
            </TabsList>

            {Object.values(templateCategories).map((category) => (
              <TabsContent
                key={category.key}
                value={category.key}
                className="space-y-2 min-h-32"
              >
                {getTemplatesByCategory(category.key).map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {template.template_name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          키: {template.template_key}
                        </p>
                        {template.description && (
                          <p className="text-xs text-gray-600 mt-2">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={template.is_active ? "default" : "secondary"}
                      >
                        {template.is_active ? "활성" : "비활성"}
                      </Badge>
                    </div>
                  </div>
                ))}

                {getTemplatesByCategory(category.key).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    이 카테고리에 템플릿이 없습니다.
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 하단 - 미리보기(좌) & 설정(우) */}
      {selectedTemplate && tempTemplate ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-96">
          {/* 좌측 - 미리보기 */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  미리보기
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">
                      제목:
                    </h4>
                    <div className="p-3 bg-gray-50 rounded border">
                      {tempTemplate.subject_template}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">
                      내용:
                    </h4>
                    <div className="border rounded overflow-hidden">
                      <div className="max-h-96 overflow-y-auto bg-white p-4">
                        <div
                          dangerouslySetInnerHTML={{
                            __html:
                              editMode === "structured" &&
                              Object.keys(structuredContent).length > 0
                                ? EmailTemplateParser.renderTemplate(
                                    tempTemplate.template_key,
                                    selectedTemplate?.html_template || "",
                                    structuredContent
                                  )
                                : tempTemplate.html_template,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 사용 가능한 변수 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">사용 가능한 변수</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  {selectedTemplate.template_key === "storage-confirmation" && (
                    <div className="space-y-2">
                      <div className="font-medium text-gray-700">
                        짐보관 확정 메일 변수:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{reservation_id}}"}
                          </code>{" "}
                          예약번호
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{customer_name}}"}
                          </code>{" "}
                          고객명
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{phone_number}}"}
                          </code>{" "}
                          연락처
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{items_description}}"}
                          </code>{" "}
                          물품설명
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{quantity}}"}
                          </code>{" "}
                          수량
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{tag_number}}"}
                          </code>{" "}
                          태그번호
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{drop_off_date_formatted}}"}
                          </code>{" "}
                          맡기기 날짜
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{pickup_date_formatted}}"}
                          </code>{" "}
                          찾기 날짜
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTemplate.template_key ===
                    "data-transfer-completion" && (
                    <div className="space-y-2">
                      <div className="font-medium text-gray-700">
                        데이터 전송 완료 변수:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{renter_name}}"}
                          </code>{" "}
                          대여자명
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{renter_phone}}"}
                          </code>{" "}
                          연락처
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{device_info}}"}
                          </code>{" "}
                          기기정보
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{return_date}}"}
                          </code>{" "}
                          반납일
                        </div>
                        <div>
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {"{{description}}"}
                          </code>{" "}
                          비고
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 우측 - 설정 */}
          <div className="space-y-4">
            {/* 기본 정보 편집 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template_name">템플릿 이름</Label>
                  <Input
                    id="template_name"
                    value={tempTemplate.template_name}
                    onChange={(e) =>
                      handleTemplateChange("template_name", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="template_key">템플릿 키</Label>
                  <Input
                    id="template_key"
                    value={tempTemplate.template_key}
                    disabled
                    className="mt-1 bg-gray-100"
                  />
                </div>

                <div>
                  <Label htmlFor="description">설명</Label>
                  <Input
                    id="description"
                    value={tempTemplate.description || ""}
                    onChange={(e) =>
                      handleTemplateChange("description", e.target.value)
                    }
                    placeholder="템플릿 설명을 입력하세요"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={tempTemplate.is_active}
                    onChange={(e) =>
                      handleTemplateChange("is_active", e.target.checked)
                    }
                    className="rounded"
                  />
                  <Label htmlFor="is_active">활성화</Label>
                </div>
              </CardContent>
            </Card>

            {/* 편집 모드 선택 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">편집 모드</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={editMode === "structured" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditMode("structured")}
                  >
                    구조화된 편집
                  </Button>
                  <Button
                    variant={editMode === "raw" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditMode("raw")}
                  >
                    코드 편집
                  </Button>
                </div>

                {editMode === "structured" ? (
                  <StructuredTemplateEditor
                    templateKey={tempTemplate.template_key}
                    htmlTemplate={tempTemplate.html_template}
                    onContentChange={(content) => {
                      setStructuredContent(content);
                      setHasUnsavedChanges(true);
                    }}
                    editConfig={EmailTemplateParser.getEditConfig(
                      tempTemplate.template_key
                    )}
                  />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subject_template">이메일 제목</Label>
                      <Input
                        id="subject_template"
                        value={tempTemplate.subject_template}
                        onChange={(e) =>
                          handleTemplateChange(
                            "subject_template",
                            e.target.value
                          )
                        }
                        placeholder="이메일 제목을 입력하세요"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="html_template">이메일 내용</Label>
                      <Textarea
                        id="html_template"
                        value={tempTemplate.html_template}
                        onChange={(e) =>
                          handleTemplateChange("html_template", e.target.value)
                        }
                        placeholder="이메일 내용을 입력하세요"
                        rows={15}
                        className="mt-1 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        HTML 태그를 사용하여 서식을 지정할 수 있습니다.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">편집할 템플릿을 선택해주세요.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
