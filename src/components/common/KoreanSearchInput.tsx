"use client";

import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useKoreanInput } from "@/hooks/useKoreanInput";
import { cn } from "@/lib/utils";

interface KoreanSearchInputProps {
  /** 검색 입력 필드의 placeholder */
  placeholder?: string;
  /** 검색 결과 변경 시 호출되는 콜백 (검색 ID 포함) */
  onSearchChange?: (filteredItems: any[], searchId?: number) => void;
  /** 검색 대상 아이템 배열 */
  items: any[];
  /** 아이템에서 검색 가능한 텍스트를 추출하는 함수 */
  getSearchableText: (item: any) => string;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 검색어 변경 시 추가 액션 (예: 날짜 범위 초기화) */
  onInputChange?: (value: string) => void;
  /** 검색어 초기화 함수 외부에서 제어할 수 있도록 */
  onClear?: () => void;
  /** 외부에서 검색어를 제어할 수 있도록 ref 제공 */
  searchRef?: React.MutableRefObject<{
    clear: () => void;
    value: string;
    debouncedValue: string;
  } | null>;
}

/**
 * 한글 검색을 지원하는 공통 검색 입력 컴포넌트
 * - 초성 검색 비활성화
 * - 한글 조합 완료 대기 (IME 처리)
 * - 디바운싱으로 성능 최적화
 * - 분해 한글 검색 지원
 */
export function KoreanSearchInput({
  placeholder = "검색어 입력",
  onSearchChange,
  items = [],
  getSearchableText,
  className,
  onInputChange,
  onClear,
  searchRef,
}: KoreanSearchInputProps) {
  const searchInput = useKoreanInput({
    delay: 200, // 디바운스 시간을 조금 늘림
    enableChoseongSearch: false,
  });

  // race condition 방지를 위한 상태 관리
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchIdRef = useRef(0);

  // 검색 결과 필터링
  useEffect(() => {
    const searchTerm = searchInput.debouncedValue.trim();
    
    // 새로운 검색 요청 ID 할당
    const currentSearchId = ++searchIdRef.current;
    
    // 이전 검색 요청이 있으면 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 새로운 AbortController 생성
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 검색어가 비어있으면 전체 목록 반환
    if (searchTerm === "") {
      // 최신 요청인지 확인 후 결과 반환
      if (currentSearchId === searchIdRef.current && !controller.signal.aborted) {
        onSearchChange?.(items, currentSearchId);
      }
      return;
    }

    // 비동기로 검색 실행
    const performSearch = async () => {
      try {
        // 검색 실행 전 요청이 유효한지 확인
        if (currentSearchId !== searchIdRef.current || controller.signal.aborted) {
          return;
        }
        
        // 미세한 delay
        await new Promise(resolve => setTimeout(resolve, 1));
        
        // 다시 한번 요청 유효성 확인
        if (currentSearchId !== searchIdRef.current || controller.signal.aborted) {
          return;
        }
        
        // 한글 검색 실행
        const filteredItems = searchInput.search(items, getSearchableText);
        
        // 검색 완료 후 최종 유효성 확인
        if (currentSearchId === searchIdRef.current && !controller.signal.aborted) {
          onSearchChange?.(filteredItems, currentSearchId);
        }
      } catch (error) {
        // AbortError는 무시
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('검색 오류:', error);
        }
      }
    };

    performSearch();

    // cleanup 함수 - 컴포넌트 언마운트 시 검색 중단
    return () => {
      if (currentSearchId === searchIdRef.current && !controller.signal.aborted) {
        controller.abort();
      }
    };
  }, [searchInput.debouncedValue, items, getSearchableText, onSearchChange]);

  // 외부에서 검색 인스턴스에 접근할 수 있도록 ref 설정
  useEffect(() => {
    if (searchRef) {
      searchRef.current = {
        clear: () => {
          searchInput.clear();
          onClear?.();
        },
        value: searchInput.inputValue,
        debouncedValue: searchInput.debouncedValue,
      };
    }
  }, [searchRef, searchInput, onClear]);

  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
      <Input
        placeholder={placeholder}
        value={searchInput.inputValue}
        onChange={(e) => {
          searchInput.setValue(e.target.value);
          onInputChange?.(e.target.value);
        }}
        onCompositionStart={searchInput.handleCompositionStart}
        onCompositionEnd={searchInput.handleCompositionEnd}
        className="text-sm pl-9"
      />
    </div>
  );
}