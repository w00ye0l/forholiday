import { useState, useCallback, useRef, useMemo } from 'react';
import { disassemble, getChoseong } from 'es-hangul';

interface UseKoreanInputOptions {
  delay?: number; // 디바운스 딜레이 (기본값: 300ms)
  onValueChange?: (value: string) => void; // 값 변경 시 콜백
  enableChoseongSearch?: boolean; // 초성 검색 활성화 (기본값: false)
}

/**
 * 한글 입력 시 조합 문자 처리를 위한 커스텀 훅 (es-hangul 기반)
 * - es-hangul 라이브러리를 활용한 고급 한글 처리
 * - 조합 중인 문자까지 정확한 검색 지원
 * - 초성 검색 기능 제공
 * - 디바운싱을 통한 성능 최적화
 */
export function useKoreanInput(options: UseKoreanInputOptions = {}) {
  const { delay = 300, onValueChange, enableChoseongSearch = false } = options;
  
  const [inputValue, setInputValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchIdRef = useRef(0); // race condition 방지를 위한 검색 ID
  const abortControllerRef = useRef<AbortController | null>(null); // 강화된 race condition 방지
  
  // race condition 방지를 위한 디바운스된 값 업데이트
  const updateDebouncedValue = useCallback((value: string) => {
    // 이전 검색 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 이전 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 새로운 검색 ID 할당
    const currentSearchId = ++searchIdRef.current;
    
    // 새로운 AbortController 생성
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    timeoutRef.current = setTimeout(() => {
      // 요청이 취소되었는지 확인
      if (controller.signal.aborted) {
        return;
      }
      
      // 최신 요청인지 확인하면 업데이트
      if (currentSearchId === searchIdRef.current) {
        setDebouncedValue(value);
        onValueChange?.(value);
      }
    }, delay);
  }, [delay, onValueChange]);
  
  // 입력값 변경 처리
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    // 항상 디바운스 실행 (조합 상태와 무관)
    updateDebouncedValue(value);
  }, [updateDebouncedValue]);
  
  // IME 조합 시작
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
    
    // 진행 중인 디바운스 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
  // IME 조합 종료
  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    
    // 조합 종료 후 최종 값으로 검색 실행
    const finalValue = e.currentTarget.value;
    setInputValue(finalValue);
    updateDebouncedValue(finalValue);
  }, [updateDebouncedValue]);
  
  // 값 직접 설정 (초기화 등에 사용)
  const setValue = useCallback((value: string) => {
    setInputValue(value);
    
    // 모든 진행 중인 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 이전 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 빈 값인 경우에만 즉시 업데이트 (초기화)
    if (value === '') {
      searchIdRef.current++;
      setDebouncedValue(value);
      onValueChange?.(value);
    } else {
      // 빈 값이 아니면 디바운싱을 통해 업데이트
      updateDebouncedValue(value);
    }
  }, [onValueChange, updateDebouncedValue]);
  
  // 클리어 함수
  const clear = useCallback(() => {
    setValue('');
  }, [setValue]);

  // 고성능 한글 검색 함수 - 최적화된 버전
  const createSearchFunction = useCallback(() => {
    return <T>(
      items: T[],
      getSearchableText: (item: T) => string,
      searchQuery: string = debouncedValue
    ): T[] => {
      if (!searchQuery.trim()) return items;

      const query = searchQuery.toLowerCase().trim();
      
      // 검색어가 매우 짧은 경우 (1-2자) 기본 텍스트 매칭만 사용
      const useSimpleSearch = query.length <= 2;
      
      return items.filter(item => {
        const text = getSearchableText(item).toLowerCase();
        
        // 1. 기본 텍스트 매치 (가장 빠름)
        if (text.includes(query)) {
          return true;
        }
        
        // 짧은 검색어는 기본 매칭만 사용하여 성능 향상
        if (useSimpleSearch) {
          return false;
        }
        
        // 2. 초성 검색 (활성화된 경우)
        if (enableChoseongSearch) {
          try {
            const textChoseong = getChoseong(text);
            if (textChoseong.includes(query)) {
              return true;
            }
          } catch (error) {
            // 에러 시 무시
          }
        }
        
        // 3. 분해된 문자 검색 (조합 중인 문자 지원)
        try {
          const disassembledText = disassemble(text);
          const disassembledQuery = disassemble(query);
          if (disassembledText.includes(disassembledQuery)) {
            return true;
          }
        } catch (error) {
          // 에러 시 무시
        }
        
        return false;
      });
    };
  }, [debouncedValue, enableChoseongSearch]);

  // 메모이제이션된 검색 함수
  const searchFunction = useMemo(createSearchFunction, [createSearchFunction]);
  
  return {
    // 상태
    inputValue,      // 현재 입력 중인 값 (UI에 표시)
    debouncedValue,  // 디바운스된 값 (검색에 사용)
    isComposing,     // 한글 조합 중 여부
    
    // 핸들러
    handleInputChange,
    handleCompositionStart,
    handleCompositionEnd,
    
    // 유틸리티
    setValue,
    clear,
    
    // 고급 검색 함수
    search: searchFunction,
    
    // input props를 위한 단축 객체
    inputProps: {
      value: inputValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e.target.value),
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
    }
  };
}