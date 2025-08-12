// 번들 크기 최적화를 위한 Lazy Loading 컴포넌트들
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
  </div>
);

// 사용 빈도가 낮은 대용량 컴포넌트들을 Lazy Load
export const LazyDeviceManager = dynamic(
  () => import('@/components/device/DeviceManager'),
  {
    loading: LoadingSpinner,
    ssr: false
  }
);

export const LazyInventoryDashboard = dynamic(
  () => import('@/components/device/InventoryDashboard'),
  {
    loading: LoadingSpinner,
    ssr: false
  }
);

export const LazyRentalStatistics = dynamic(
  () => import('@/components/rental/RentalStatistics'),
  {
    loading: LoadingSpinner,
    ssr: false
  }
);

export const LazyStorageStatistics = dynamic(
  () => import('@/components/storage/StorageStatistics'),
  {
    loading: LoadingSpinner,
    ssr: false
  }
);

export const LazyChartAreaInteractive = dynamic(
  () => import('@/components/chart-area-interactive'),
  {
    loading: LoadingSpinner,
    ssr: false
  }
);

// 관리자 전용 컴포넌트들
export const LazyStructuredTemplateEditor = dynamic(
  () => import('@/components/admin/StructuredTemplateEditor'),
  {
    loading: LoadingSpinner,
    ssr: false
  }
);

// 날짜 관련 대용량 라이브러리 최적화
export const useDateFns = () => {
  return import('date-fns').then(module => module);
};

export const useDateFnsLocale = () => {
  return import('date-fns/locale').then(module => module.ko);
};

// 아이콘 번들 최적화 - 필요한 아이콘만 로드
export const LucideIcons = {
  Calendar: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Calendar })), { ssr: false }),
  Package: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Package })), { ssr: false }),
  MapPin: dynamic(() => import('lucide-react').then(mod => ({ default: mod.MapPin })), { ssr: false }),
  TrendingUp: dynamic(() => import('lucide-react').then(mod => ({ default: mod.TrendingUp })), { ssr: false }),
  Save: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Save })), { ssr: false }),
  Clock: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Clock })), { ssr: false }),
  User: dynamic(() => import('lucide-react').then(mod => ({ default: mod.User })), { ssr: false }),
  Phone: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Phone })), { ssr: false }),
};

// 타입 정의
export type LazyComponentType<T = {}> = ComponentType<T>;