"use client";

import { useEffect, useCallback, useRef } from "react";

interface UseAccessibilityProps {
  announcementDelay?: number;
}

interface UseAccessibilityReturn {
  announceToScreenReader: (
    message: string,
    priority?: "polite" | "assertive"
  ) => void;
  handleKeyboardNavigation: (
    event: KeyboardEvent,
    actions: Record<string, () => void>
  ) => void;
  focusElement: (elementId: string) => void;
  addSkipLink: (targetId: string, label: string) => void;
}

export const useAccessibility = ({
  announcementDelay = 100,
}: UseAccessibilityProps = {}): UseAccessibilityReturn => {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  // 스크린 리더 알림
  const announceToScreenReader = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (!announcementRef.current) {
        // 동적으로 알림 요소 생성
        const announcementElement = document.createElement("div");
        announcementElement.setAttribute("aria-live", priority);
        announcementElement.setAttribute("aria-atomic", "true");
        announcementElement.setAttribute("role", "status");
        announcementElement.style.position = "absolute";
        announcementElement.style.left = "-10000px";
        announcementElement.style.width = "1px";
        announcementElement.style.height = "1px";
        announcementElement.style.overflow = "hidden";
        document.body.appendChild(announcementElement);
        announcementRef.current = announcementElement;
      }

      // 딜레이 후 메시지 설정 (스크린 리더가 인식할 수 있도록)
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = message;

          // 메시지 클리어 (다음 알림을 위해)
          setTimeout(() => {
            if (announcementRef.current) {
              announcementRef.current.textContent = "";
            }
          }, 1000);
        }
      }, announcementDelay);
    },
    [announcementDelay]
  );

  // 키보드 네비게이션 처리
  const handleKeyboardNavigation = useCallback(
    (event: KeyboardEvent, actions: Record<string, () => void>) => {
      const { key, ctrlKey, shiftKey, altKey } = event;

      // 키 조합을 문자열로 변환
      const keyCombo = [
        ctrlKey && "Ctrl",
        shiftKey && "Shift",
        altKey && "Alt",
        key,
      ]
        .filter(Boolean)
        .join("+");

      if (actions[key]) {
        event.preventDefault();
        actions[key]();
      } else if (actions[keyCombo]) {
        event.preventDefault();
        actions[keyCombo]();
      }
    },
    []
  );

  // 요소에 포커스 이동
  const focusElement = useCallback(
    (elementId: string) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.focus();

        // 포커스 이동 알림
        const elementLabel =
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          element.textContent?.trim() ||
          "요소";

        announceToScreenReader(`${elementLabel}로 이동했습니다.`);
      }
    },
    [announceToScreenReader]
  );

  // 스킵 링크 추가
  const addSkipLink = useCallback(
    (targetId: string, label: string) => {
      // 기존 스킵 링크가 있는지 확인
      const existingSkipLink = document.querySelector(`a[href="#${targetId}"]`);
      if (existingSkipLink) return;

      const skipLink = document.createElement("a");
      skipLink.href = `#${targetId}`;
      skipLink.textContent = label;
      skipLink.className = "skip-link";

      // 스킵 링크 스타일 (화면에서 숨겨져 있다가 포커스 시 표시)
      skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 10000;
      transition: top 0.3s;
    `;

      // 포커스 시 표시
      skipLink.addEventListener("focus", () => {
        skipLink.style.top = "6px";
      });

      // 블러 시 숨김
      skipLink.addEventListener("blur", () => {
        skipLink.style.top = "-40px";
      });

      // 클릭 시 대상 요소로 이동
      skipLink.addEventListener("click", (e) => {
        e.preventDefault();
        focusElement(targetId);
      });

      // body 맨 앞에 추가
      document.body.insertBefore(skipLink, document.body.firstChild);
    },
    [focusElement]
  );

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
        announcementRef.current = null;
      }
    };
  }, []);

  return {
    announceToScreenReader,
    handleKeyboardNavigation,
    focusElement,
    addSkipLink,
  };
};

// 접근성 키보드 단축키 상수
export const ACCESSIBILITY_SHORTCUTS = {
  // 네비게이션
  NEXT_ITEM: "ArrowDown",
  PREV_ITEM: "ArrowUp",
  NEXT_PAGE: "ArrowRight",
  PREV_PAGE: "ArrowLeft",
  FIRST_ITEM: "Home",
  LAST_ITEM: "End",

  // 액션
  ACTIVATE: "Enter",
  SELECT: " ", // 스페이스바
  ESCAPE: "Escape",
  DELETE: "Delete",

  // 검색 및 필터
  SEARCH: "Ctrl+f",
  FILTER: "Ctrl+Shift+f",
  CLEAR_FILTER: "Ctrl+Shift+x",

  // 뷰 변경
  TIMELINE_VIEW: "Ctrl+1",
  LIST_VIEW: "Ctrl+2",
  CALENDAR_VIEW: "Ctrl+3",

  // 도움말
  HELP: "Ctrl+Shift+?",
} as const;

// ARIA 레이블 헬퍼 함수들
export const getAriaLabel = {
  // 예약 상태 레이블
  reservationStatus: (
    status: string,
    renterName: string,
    deviceName: string
  ) => {
    const statusLabels = {
      pending: "수령 대기 중",
      picked_up: "대여 중",
      returned: "반납 완료",
      overdue: "연체",
      cancelled: "취소됨",
    };

    const statusLabel =
      statusLabels[status as keyof typeof statusLabels] || status;
    return `${renterName}님의 ${deviceName} ${statusLabel}`;
  },

  // 날짜 레이블
  dateLabel: (date: string) => {
    const dateObj = new Date(date);
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    return formatter.format(dateObj);
  },

  // 기기 카테고리 레이블
  deviceCategory: (category: string, count: number) => {
    return `${category} 카테고리, ${count}개 기기`;
  },

  // 로딩 상태 레이블
  loadingState: (isLoading: boolean, context: string) => {
    return isLoading ? `${context} 로딩 중` : `${context} 로딩 완료`;
  },
};

// 접근성 검증 헬퍼
export const validateAccessibility = {
  // 필수 ARIA 속성 확인
  checkRequiredAria: (element: HTMLElement) => {
    const requiredAttrs = ["aria-label", "aria-labelledby", "aria-describedby"];
    const hasRequiredAria = requiredAttrs.some((attr) =>
      element.hasAttribute(attr)
    );

    if (!hasRequiredAria && !element.textContent?.trim()) {
      console.warn("접근성 경고: 요소에 적절한 레이블이 없습니다.", element);
    }

    return hasRequiredAria;
  },

  // 포커스 가능한 요소 확인
  checkFocusable: (element: HTMLElement) => {
    const focusableSelectors = [
      "button",
      "input",
      "select",
      "textarea",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      "[contenteditable]",
    ];

    const isFocusable = focusableSelectors.some((selector) =>
      element.matches(selector)
    );

    if (!isFocusable && element.onclick) {
      console.warn(
        "접근성 경고: 클릭 가능한 요소가 포커스 불가능합니다.",
        element
      );
    }

    return isFocusable;
  },

  // 색상 대비 확인 (간단한 체크)
  checkColorContrast: (element: HTMLElement) => {
    const styles = window.getComputedStyle(element);
    const bgColor = styles.backgroundColor;
    const textColor = styles.color;

    // 실제 구현에서는 더 정교한 색상 대비 계산이 필요
    // 여기서는 간단한 예시만 제공
    if (bgColor === textColor) {
      console.warn("접근성 경고: 배경색과 텍스트 색상이 동일합니다.", element);
      return false;
    }

    return true;
  },
};
