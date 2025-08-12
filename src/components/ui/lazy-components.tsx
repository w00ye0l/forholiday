// 번들 크기 최적화를 위한 Lazy Loading 컴포넌트들
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
  </div>
);

// 실제로 사용되는 컴포넌트들만 Lazy Load
export const LazyDeviceManager = dynamic(
  () => import('@/components/device/DeviceManager'),
  {
    loading: LoadingSpinner,
    ssr: false
  }
);

// 기본적인 유틸리티 함수들
export const loadDateFns = async () => {
  return import('date-fns');
};

export const loadDateFnsLocale = async () => {
  const module = await import('date-fns/locale');
  return module.ko;
};

// 타입 정의
export type LazyComponentType<T = {}> = ComponentType<T>;