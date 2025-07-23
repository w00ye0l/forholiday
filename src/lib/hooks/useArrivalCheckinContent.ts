import { useState, useEffect } from "react";

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

interface ArrivalCheckinContent {
  content: ContentItem[];
  images: ImageItem[];
}

export function useArrivalCheckinContent() {
  const [data, setData] = useState<ArrivalCheckinContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/arrival-checkin/content", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("콘텐츠 로드에 실패했습니다");
      }

      const contentData = await response.json();
      setData(contentData);
    } catch (err) {
      console.error("콘텐츠 로드 실패:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const getContentByKey = (key: string, language: "ko" | "en" | "ja" = "ko"): string => {
    const item = data?.content.find(item => item.key === key);
    return item?.content[language] || "";
  };

  const getImageByKey = (key: string): ImageItem | null => {
    return data?.images.find(item => item.key === key) || null;
  };

  return {
    data,
    isLoading,
    error,
    getContentByKey,
    getImageByKey,
    reload: loadContent,
  };
}