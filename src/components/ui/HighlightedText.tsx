"use client";

import { memo, useMemo } from "react";

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
}

/**
 * 검색어를 하이라이트하는 텍스트 컴포넌트
 * - 대소문자 구분없이 검색어 하이라이트
 * - 여러 검색어 지원 (공백으로 구분)
 * - 성능 최적화를 위한 메모이제이션
 */
export const HighlightedText = memo<HighlightedTextProps>(({
  text,
  searchTerm,
  className = "",
}) => {
  // 하이라이트 로직을 useMemo로 최적화
  const highlightedContent = useMemo(() => {
    // 검색어가 없으면 원본 텍스트 반환
    if (!searchTerm || !searchTerm.trim()) {
      return text;
    }

    // 검색어를 공백으로 분리하고 빈 값 제거
    const searchTerms = searchTerm
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 0);

    if (searchTerms.length === 0) {
      return text;
    }

    // 모든 검색어를 하나의 정규식으로 결합 (대소문자 구분 없음)
    const escapedTerms = searchTerms.map(term => 
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

    // 텍스트를 검색어 기준으로 분할
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // 검색어에 매칭되는 부분인지 확인
      const isMatch = searchTerms.some(term => 
        part.toLowerCase() === term.toLowerCase()
      );

      if (isMatch) {
        return (
          <mark 
            key={index} 
            className="bg-yellow-200 text-yellow-900 px-0.5 rounded"
          >
            {part}
          </mark>
        );
      }

      return part;
    });
  }, [text, searchTerm]);

  return <span className={className}>{highlightedContent}</span>;
});

HighlightedText.displayName = 'HighlightedText';