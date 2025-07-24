"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SaveIcon,
  RefreshCwIcon,
  EyeIcon,
  AlertCircleIcon,
  ImageIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface ContentItem {
  key: string;
  content: {
    ko: string;
    en: string;
    ja: string;
  };
  content_type: string;
}

interface ImageItem {
  key: string;
  image_url: string;
  alt_text: {
    ko: string;
    en: string;
    ja: string;
  };
}

type LanguageCode = "ko" | "en" | "ja";

const languageNames = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

const selectLanguageLabels = {
  ko: "언어 선택",
  en: "Language",
  ja: "言語選択",
};

const languages = [
  { code: "ko" as const, name: "한국어" },
  { code: "en" as const, name: "English" },
  { code: "ja" as const, name: "日本語" },
];

const serviceTypes = [
  {
    key: "rentalReturn",
    labelKey: "service_rental_return",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    key: "rentalPickup",
    labelKey: "service_rental_pickup",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    key: "storageDropoff",
    labelKey: "service_storage_dropoff",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    key: "storagePickup",
    labelKey: "service_storage_pickup",
    color: "bg-green-500 hover:bg-green-600",
  },
];

const arrivalStatuses = [
  { key: "thirty_min", labelKey: "arrival_thirty_min" },
  { key: "ten_min", labelKey: "arrival_ten_min" },
  { key: "at_counter", labelKey: "arrival_at_counter" },
] as const;

export default function ArrivalCheckinAdmin() {
  // 원본 데이터 (서버에서 로드된 데이터)
  const [originalContentItems, setOriginalContentItems] = useState<ContentItem[]>([]);
  const [originalImageItems, setOriginalImageItems] = useState<ImageItem[]>([]);
  
  // 임시 저장용 state (저장 버튼 누르기 전까지 사용)
  const [tempContentItems, setTempContentItems] = useState<ContentItem[]>([]);
  const [tempImageItems, setTempImageItems] = useState<ImageItem[]>([]);
  const [tempImageFiles, setTempImageFiles] = useState<{[key: string]: File}>({});
  
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>("ko");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Preview states
  const [previewLanguage, setPreviewLanguage] = useState<LanguageCode>("ko");
  const [previewFormData, setPreviewFormData] = useState({
    name: "",
    terminal: "",
    arrivalStatus: "",
    serviceType: "",
    tagName: "",
  });

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/arrival-checkin/content");
      const data = await response.json();

      if (response.ok) {
        setOriginalContentItems(data.content || []);
        setOriginalImageItems(data.images || []);
        
        // Initialize temp states
        setTempContentItems(data.content || []);
        setTempImageItems(data.images || []);
        setTempImageFiles({});
        
      } else {
        throw new Error(data.error || "콘텐츠 불러오기 실패");
      }
    } catch (error) {
      toast.error("콘텐츠를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for editing
  const getContentByKey = (key: string): ContentItem | undefined => {
    return tempContentItems.find((item) => item.key === key);
  };

  const getImageByKey = (key: string): ImageItem | undefined => {
    return tempImageItems.find((item) => item.key === key);
  };

  // Helper functions for preview
  const getContentByKeyAndLanguage = (
    key: string,
    language: LanguageCode
  ): string => {
    const item = tempContentItems.find((item) => item.key === key);
    return item?.content[language] || "";
  };

  const handleContentChange = (
    key: string,
    language: LanguageCode,
    value: string
  ) => {
    setTempContentItems((prev) => {
      const existingItem = prev.find((item) => item.key === key);
      if (existingItem) {
        return prev.map((item) =>
          item.key === key
            ? { ...item, content: { ...item.content, [language]: value } }
            : item
        );
      } else {
        return [
          ...prev,
          {
            key,
            content: { ko: "", en: "", ja: "", [language]: value },
            content_type: "text",
          },
        ];
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleImageAltTextChange = (
    key: string,
    language: LanguageCode,
    value: string
  ) => {
    setTempImageItems((prev) => {
      const existingItem = prev.find((item) => item.key === key);
      if (existingItem) {
        return prev.map((item) =>
          item.key === key
            ? {
                ...item,
                alt_text: { ...item.alt_text, [language]: value },
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            key,
            image_url: "/images/" + key + ".png",
            alt_text: { ko: "", en: "", ja: "", [language]: value },
          },
        ];
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleImageUpload = (key: string, file: File) => {
    try {
      setTempImageFiles((prev) => ({
        ...prev,
        [key]: file,
      }));

      const previewUrl = URL.createObjectURL(file);

      setTempImageItems((prev) => {
        const existingItem = prev.find((item) => item.key === key);
        if (existingItem) {
          return prev.map((item) =>
            item.key === key ? { ...item, image_url: previewUrl } : item
          );
        } else {
          return [
            ...prev,
            {
              key,
              image_url: previewUrl,
              alt_text: { ko: "", en: "", ja: "" },
            },
          ];
        }
      });

      setHasUnsavedChanges(true);
      toast.success("이미지가 선택되었습니다. 저장 버튼을 눌러 업로드하세요.");
    } catch (error) {
      toast.error("이미지 선택에 실패했습니다.");
    }
  };

  const handleCancel = () => {
    setTempContentItems([...originalContentItems]);
    setTempImageItems([...originalImageItems]);
    setTempImageFiles({});
    setHasUnsavedChanges(false);
    toast.success("변경사항이 취소되었습니다.");
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // 1. Upload new images first
      const updatedImageItems = [...tempImageItems];
      
      for (const [key, file] of Object.entries(tempImageFiles)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("key", key);

        const uploadResponse = await fetch("/api/admin/arrival-checkin/images", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`이미지 업로드 실패: ${key}`);
        }

        const uploadData = await uploadResponse.json();
        
        const itemIndex = updatedImageItems.findIndex(item => item.key === key);
        if (itemIndex >= 0) {
          updatedImageItems[itemIndex] = {
            ...updatedImageItems[itemIndex],
            image_url: uploadData.image_url,
          };
        }
      }

      // 2. Save content and image info
      const response = await fetch("/api/admin/arrival-checkin/content", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: tempContentItems,
          images: updatedImageItems,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setOriginalContentItems(tempContentItems);
        setOriginalImageItems(updatedImageItems);
        setTempImageFiles({});
        
        toast.success("변경사항이 저장되었습니다.");
        setHasUnsavedChanges(false);
      } else {
        throw new Error(data.error || "저장 실패");
      }
    } catch (error) {
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    
    const loadContentWithCleanup = async () => {
      if (!isCancelled) {
        await loadContent();
      }
    };
    
    loadContentWithCleanup();
    
    return () => {
      isCancelled = true;
    };
  }, []);

  // Sync edit and preview languages
  useEffect(() => {
    setPreviewLanguage(activeLanguage);
  }, [activeLanguage]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCwIcon className="h-8 w-8 animate-spin" />
          <span className="ml-2">콘텐츠를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 max-w-7xl overflow-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">도착 체크인 콘텐츠 관리</h1>
          <p className="text-gray-600 mt-1">
            도착 체크인 페이지의 텍스트와 이미지를 편집할 수 있습니다.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {hasUnsavedChanges && (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-800"
            >
              <AlertCircleIcon className="h-3 w-3 mr-1" />
              저장되지 않은 변경사항
            </Badge>
          )}

          <Button onClick={loadContent} variant="outline" disabled={isLoading}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
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
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <SaveIcon className="h-4 w-4 mr-2" />
            )}
            저장
          </Button>
        </div>
      </div>

      {/* 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* 좌측 - 미리보기 섹션 */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <EyeIcon className="h-5 w-5" />
                  실시간 미리보기
                </CardTitle>
                <div className="flex gap-2">
                  {Object.entries(languageNames).map(([code, name]) => (
                    <Button
                      key={code}
                      variant={activeLanguage === code ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveLanguage(code as LanguageCode)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto p-4">
              {/* 실제 도착 체크인 페이지와 동일한 구조 */}
              <div className="min-h-96 bg-gray-50 flex items-center justify-center p-4 rounded-lg">
                <Card className="w-full max-w-md shadow-lg">
                  <CardHeader className="pb-4">
                    {/* 언어 선택 */}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold">
                        {selectLanguageLabels[previewLanguage]}
                      </span>
                      <Select
                        value={previewLanguage}
                        onValueChange={(value: LanguageCode) =>
                          setPreviewLanguage(value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <CardTitle className="text-2xl font-bold">
                      {getContentByKeyAndLanguage(
                        "page_title",
                        previewLanguage
                      )}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* 설명 */}
                    <div className="text-sm text-gray-700">
                      <p className="mb-2">
                        {getContentByKeyAndLanguage(
                          "page_description",
                          previewLanguage
                        )}
                      </p>
                      <p className="text-red-600 font-medium">
                        {getContentByKeyAndLanguage(
                          "foreigner_notice",
                          previewLanguage
                        )}
                      </p>
                    </div>

                    {/* 터미널 위치 정보 */}
                    <div className="space-y-4">
                      <div className="flex flex-col items-center">
                        <div className="w-full max-w-xs bg-gray-200 rounded-lg shadow-md flex items-center justify-center mb-2 overflow-hidden">
                          <Image
                            className="w-full object-contain"
                            src={
                              getImageByKey("terminal1_image")?.image_url ||
                              "/images/terminal1.png"
                            }
                            alt={
                              getImageByKey("terminal1_image")?.alt_text?.[
                                previewLanguage
                              ] || "Terminal 1"
                            }
                            width={320}
                            height={240}
                          />
                        </div>
                        <span className="text-base font-semibold text-gray-700 text-center">
                          {getContentByKeyAndLanguage(
                            "terminal1_location",
                            previewLanguage
                          )}
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-full max-w-xs bg-gray-200 rounded-lg shadow-md flex items-center justify-center mb-2 overflow-hidden">
                          <Image
                            className="w-full object-contain"
                            src={
                              getImageByKey("terminal2_image")?.image_url ||
                              "/images/terminal2.png"
                            }
                            alt={
                              getImageByKey("terminal2_image")?.alt_text?.[
                                previewLanguage
                              ] || "Terminal 2"
                            }
                            width={320}
                            height={180}
                          />
                        </div>
                        <span className="text-base font-semibold text-gray-700 text-center">
                          {getContentByKeyAndLanguage(
                            "terminal2_location",
                            previewLanguage
                          )}
                        </span>
                      </div>
                    </div>

                    {/* 서비스 타입 선택 */}
                    <div className="grid grid-cols-2 gap-2">
                      {serviceTypes.map((service) => (
                        <Button
                          key={service.key}
                          type="button"
                          variant={
                            previewFormData.serviceType === service.key
                              ? "default"
                              : "outline"
                          }
                          className={`text-white text-sm py-3 h-auto whitespace-normal ${
                            previewFormData.serviceType === service.key
                              ? service.color
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() =>
                            setPreviewFormData({
                              ...previewFormData,
                              serviceType: service.key,
                            })
                          }
                        >
                          {getContentByKeyAndLanguage(
                            service.labelKey,
                            previewLanguage
                          )}
                        </Button>
                      ))}
                    </div>

                    {/* 이름 입력 */}
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">
                        {getContentByKeyAndLanguage(
                          "label_name",
                          previewLanguage
                        )}
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={previewFormData.name}
                        onChange={(e) =>
                          setPreviewFormData({
                            ...previewFormData,
                            name: e.target.value,
                          })
                        }
                        placeholder={getContentByKeyAndLanguage(
                          "placeholder_name",
                          previewLanguage
                        )}
                        className="mt-1"
                      />
                    </div>

                    {/* 태그 이름 (짐보관-찾기인 경우에만 표시) */}
                    {previewFormData.serviceType === "storagePickup" && (
                      <div>
                        <Label
                          htmlFor="tagName"
                          className="text-sm font-medium"
                        >
                          {getContentByKeyAndLanguage(
                            "label_tag_name",
                            previewLanguage
                          )}
                        </Label>
                        <Input
                          id="tagName"
                          type="text"
                          value={previewFormData.tagName}
                          onChange={(e) =>
                            setPreviewFormData({
                              ...previewFormData,
                              tagName: e.target.value,
                            })
                          }
                          placeholder={getContentByKeyAndLanguage(
                            "placeholder_tag_name",
                            previewLanguage
                          )}
                          className="mt-1"
                        />
                      </div>
                    )}

                    {/* 터미널 선택 */}
                    <div>
                      <Label htmlFor="terminal" className="text-sm font-medium">
                        {getContentByKeyAndLanguage(
                          "label_terminal",
                          previewLanguage
                        )}
                      </Label>
                      <Select
                        value={previewFormData.terminal}
                        onValueChange={(value) =>
                          setPreviewFormData({
                            ...previewFormData,
                            terminal: value,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue
                            placeholder={getContentByKeyAndLanguage(
                              "label_terminal",
                              previewLanguage
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="terminal1">
                            {getContentByKeyAndLanguage(
                              "terminal1_name",
                              previewLanguage
                            )}
                          </SelectItem>
                          <SelectItem value="terminal2">
                            {getContentByKeyAndLanguage(
                              "terminal2_name",
                              previewLanguage
                            )}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 도착 상태 */}
                    <div>
                      <Label
                        htmlFor="arrivalStatus"
                        className="text-sm font-medium"
                      >
                        {getContentByKeyAndLanguage(
                          "label_arrival_status",
                          previewLanguage
                        )}
                      </Label>
                      <Select
                        value={previewFormData.arrivalStatus}
                        onValueChange={(value) =>
                          setPreviewFormData({
                            ...previewFormData,
                            arrivalStatus: value,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue
                            placeholder={getContentByKeyAndLanguage(
                              "placeholder_arrival_status",
                              previewLanguage
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {arrivalStatuses.map((status) => (
                            <SelectItem key={status.key} value={status.key}>
                              {getContentByKeyAndLanguage(
                                status.labelKey,
                                previewLanguage
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 전송 버튼 */}
                    <Button type="button" className="w-full mt-6" disabled>
                      {getContentByKeyAndLanguage(
                        "button_submit",
                        previewLanguage
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 우측 - 콘텐츠 설정 섹션 */}
        <div className="space-y-4 h-full">
          {/* 콘텐츠 편집 탭 */}
          <Tabs
            value={activeLanguage}
            onValueChange={(value) => setActiveLanguage(value as LanguageCode)}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-3 mb-4">
              {Object.entries(languageNames).map(([code, name]) => (
                <TabsTrigger key={code} value={code}>
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(languageNames).map((langCode) => (
              <TabsContent
                key={langCode}
                value={langCode}
                className="space-y-4"
              >
                {/* 페이지 기본 정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">페이지 기본 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="page_title">페이지 제목</Label>
                      <Input
                        id="page_title"
                        value={
                          getContentByKey("page_title")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "page_title",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="page_description">페이지 설명</Label>
                      <Textarea
                        id="page_description"
                        value={
                          getContentByKey("page_description")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "page_description",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="foreigner_notice">외국인 안내문</Label>
                      <Input
                        id="foreigner_notice"
                        value={
                          getContentByKey("foreigner_notice")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "foreigner_notice",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 이미지 설정 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      이미지 설정
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 터미널 1 이미지 */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">
                          제 1터미널 이미지
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)
                                .files?.[0];
                              if (file) {
                                handleImageUpload("terminal1_image", file);
                              }
                            };
                            input.click();
                          }}
                        >
                          <UploadIcon className="h-4 w-4 mr-2" />
                          업로드
                        </Button>
                      </div>

                      {/* 현재 이미지 미리보기 */}
                      <div className="mb-3">
                        <div className="w-32 h-24 bg-gray-100 rounded border overflow-hidden">
                          <Image
                            src={
                              getImageByKey("terminal1_image")?.image_url ||
                              "/images/terminal1.png"
                            }
                            alt="Terminal 1 Preview"
                            width={128}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Alt 텍스트 */}
                      <div>
                        <Label htmlFor="terminal1_alt" className="text-xs">
                          Alt 텍스트 ({languageNames[langCode as LanguageCode]})
                        </Label>
                        <Input
                          id="terminal1_alt"
                          value={
                            getImageByKey("terminal1_image")?.alt_text?.[
                              langCode as LanguageCode
                            ] || ""
                          }
                          onChange={(e) =>
                            handleImageAltTextChange(
                              "terminal1_image",
                              langCode as LanguageCode,
                              e.target.value
                            )
                          }
                          className="mt-1 text-xs"
                          placeholder="이미지 설명을 입력하세요"
                        />
                      </div>
                    </div>

                    {/* 터미널 2 이미지 */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">
                          제 2터미널 이미지
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)
                                .files?.[0];
                              if (file) {
                                handleImageUpload("terminal2_image", file);
                              }
                            };
                            input.click();
                          }}
                        >
                          <UploadIcon className="h-4 w-4 mr-2" />
                          업로드
                        </Button>
                      </div>

                      {/* 현재 이미지 미리보기 */}
                      <div className="mb-3">
                        <div className="w-32 h-24 bg-gray-100 rounded border overflow-hidden">
                          <Image
                            src={
                              getImageByKey("terminal2_image")?.image_url ||
                              "/images/terminal2.png"
                            }
                            alt="Terminal 2 Preview"
                            width={128}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Alt 텍스트 */}
                      <div>
                        <Label htmlFor="terminal2_alt" className="text-xs">
                          Alt 텍스트 ({languageNames[langCode as LanguageCode]})
                        </Label>
                        <Input
                          id="terminal2_alt"
                          value={
                            getImageByKey("terminal2_image")?.alt_text?.[
                              langCode as LanguageCode
                            ] || ""
                          }
                          onChange={(e) =>
                            handleImageAltTextChange(
                              "terminal2_image",
                              langCode as LanguageCode,
                              e.target.value
                            )
                          }
                          className="mt-1 text-xs"
                          placeholder="이미지 설명을 입력하세요"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 서비스 타입 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">서비스 타입</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="service_rental_return">대여 - 반납</Label>
                      <Input
                        id="service_rental_return"
                        value={
                          getContentByKey("service_rental_return")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "service_rental_return",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="service_rental_pickup">대여 - 수령</Label>
                      <Input
                        id="service_rental_pickup"
                        value={
                          getContentByKey("service_rental_pickup")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "service_rental_pickup",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="service_storage_dropoff">
                        짐보관 - 맡기기
                      </Label>
                      <Input
                        id="service_storage_dropoff"
                        value={
                          getContentByKey("service_storage_dropoff")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "service_storage_dropoff",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="service_storage_pickup">
                        짐보관 - 찾기
                      </Label>
                      <Input
                        id="service_storage_pickup"
                        value={
                          getContentByKey("service_storage_pickup")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "service_storage_pickup",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 폼 필드 라벨 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">폼 필드</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="label_name">이름 라벨</Label>
                      <Input
                        id="label_name"
                        value={
                          getContentByKey("label_name")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "label_name",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="placeholder_name">이름 Placeholder</Label>
                      <Input
                        id="placeholder_name"
                        value={
                          getContentByKey("placeholder_name")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "placeholder_name",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="label_terminal">터미널 라벨</Label>
                      <Input
                        id="label_terminal"
                        value={
                          getContentByKey("label_terminal")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "label_terminal",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="label_tag_name">짐 태그 번호 라벨</Label>
                      <Input
                        id="label_tag_name"
                        value={
                          getContentByKey("label_tag_name")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "label_tag_name",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="placeholder_tag_name">
                        짐 태그 번호 Placeholder
                      </Label>
                      <Input
                        id="placeholder_tag_name"
                        value={
                          getContentByKey("placeholder_tag_name")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "placeholder_tag_name",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="label_arrival_status">
                        도착 상태 라벨
                      </Label>
                      <Input
                        id="label_arrival_status"
                        value={
                          getContentByKey("label_arrival_status")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "label_arrival_status",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="placeholder_arrival_status">
                        도착 상태 Placeholder
                      </Label>
                      <Input
                        id="placeholder_arrival_status"
                        value={
                          getContentByKey("placeholder_arrival_status")
                            ?.content[langCode as LanguageCode] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "placeholder_arrival_status",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 터미널 정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">터미널 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="terminal1_name">제 1터미널 이름</Label>
                      <Input
                        id="terminal1_name"
                        value={
                          getContentByKey("terminal1_name")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "terminal1_name",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="terminal2_name">제 2터미널 이름</Label>
                      <Input
                        id="terminal2_name"
                        value={
                          getContentByKey("terminal2_name")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "terminal2_name",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="terminal1_location">
                        제 1터미널 위치 정보
                      </Label>
                      <Textarea
                        id="terminal1_location"
                        value={
                          getContentByKey("terminal1_location")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "terminal1_location",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="terminal2_location">
                        제 2터미널 위치 정보
                      </Label>
                      <Textarea
                        id="terminal2_location"
                        value={
                          getContentByKey("terminal2_location")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "terminal2_location",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 도착 상태 옵션 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">도착 상태 옵션</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="arrival_thirty_min">도착 30분 전</Label>
                      <Input
                        id="arrival_thirty_min"
                        value={
                          getContentByKey("arrival_thirty_min")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "arrival_thirty_min",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="arrival_ten_min">도착 10분 전</Label>
                      <Input
                        id="arrival_ten_min"
                        value={
                          getContentByKey("arrival_ten_min")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "arrival_ten_min",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="arrival_at_counter">카운터 도착</Label>
                      <Input
                        id="arrival_at_counter"
                        value={
                          getContentByKey("arrival_at_counter")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "arrival_at_counter",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 버튼 텍스트 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">버튼 및 메시지</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="button_submit">전송 버튼</Label>
                      <Input
                        id="button_submit"
                        value={
                          getContentByKey("button_submit")?.content[
                            langCode as LanguageCode
                          ] || ""
                        }
                        onChange={(e) =>
                          handleContentChange(
                            "button_submit",
                            langCode as LanguageCode,
                            e.target.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
