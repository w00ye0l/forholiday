'use client'

import { useState } from 'react'
import { RentalCompactCard } from '@/components/showcase/RentalCompactCard'
import { RentalMinimalList } from '@/components/showcase/RentalMinimalList'
import { RentalTimelineCard } from '@/components/showcase/RentalTimelineCard'
import { RentalStatusBadge } from '@/components/showcase/RentalStatusBadge'
import { RentalGridView } from '@/components/showcase/RentalGridView'
import { RentalKanbanCard } from '@/components/showcase/RentalKanbanCard'
import { RentalHotelStyle } from '@/components/showcase/RentalHotelStyle'
import { RentalTicketStyle } from '@/components/showcase/RentalTicketStyle'
import { RentalGlassCard } from '@/components/showcase/RentalGlassCard'
import { RentalActionCard } from '@/components/showcase/RentalActionCard'

// 샘플 데이터
const sampleData = {
  id: 'RT202412201A2B',
  customer_name: '김민수',
  customer_phone: '010-1234-5678',
  equipment_types: ['노트북', '태블릿'],
  rental_start_date: '2024-12-20',
  rental_end_date: '2024-12-25',
  pickup_location: 'T1',
  return_location: 'T2',
  status: 'pending' as const,
  total_amount: 50000,
  deposit_amount: 100000,
  notes: '오전 10시 픽업 예정'
}

const confirmedData = {
  ...sampleData,
  id: 'RT202412191B3C',
  status: 'picked_up' as const,
  customer_name: '이영희',
  rental_start_date: '2024-12-19',
  rental_end_date: '2024-12-24',
}

const returnedData = {
  ...sampleData,
  id: 'RT202412181C4D',
  status: 'returned' as const,
  customer_name: '박철수',
  rental_start_date: '2024-12-18',
  rental_end_date: '2024-12-23',
}

export default function ComponentsPage() {
  const [selectedStyle, setSelectedStyle] = useState<'all' | 'compact' | 'minimal' | 'timeline' | 'badge' | 'grid' | 'kanban' | 'hotel' | 'ticket' | 'glass' | 'action'>('all')

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">예약 컴포넌트 쇼케이스</h1>
          <p className="text-sm sm:text-base text-gray-600">다양한 스타일의 예약 카드 컴포넌트를 확인해보세요</p>
        </div>

        {/* 스타일 선택 탭 */}
        <div className="mb-6 sm:mb-8 border-b overflow-x-auto">
          <div className="flex space-x-1 sm:space-x-2 min-w-max">
            {[
              { value: 'all', label: '전체' },
              { value: 'compact', label: 'Compact' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'timeline', label: 'Timeline' },
              { value: 'badge', label: 'Badge' },
              { value: 'grid', label: 'Grid' },
              { value: 'kanban', label: 'Kanban' },
              { value: 'hotel', label: 'Hotel' },
              { value: 'ticket', label: 'Ticket' },
              { value: 'glass', label: 'Glass' },
              { value: 'action', label: 'Action' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedStyle(tab.value as any)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedStyle === tab.value
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Card Style */}
        {(selectedStyle === 'all' || selectedStyle === 'compact') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Compact Card Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">카드 형태의 컴팩트한 디자인으로 주요 정보를 한눈에 확인할 수 있습니다.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <RentalCompactCard data={sampleData} />
              <RentalCompactCard data={confirmedData} />
              <RentalCompactCard data={returnedData} />
            </div>
          </section>
        )}

        {/* Minimal List Style */}
        {(selectedStyle === 'all' || selectedStyle === 'minimal') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Minimal List Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">최소한의 정보만 표시하는 리스트 형태의 깔끔한 디자인입니다.</p>
            <div className="space-y-2">
              <RentalMinimalList data={sampleData} />
              <RentalMinimalList data={confirmedData} />
              <RentalMinimalList data={returnedData} />
            </div>
          </section>
        )}

        {/* Timeline Style */}
        {(selectedStyle === 'all' || selectedStyle === 'timeline') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Timeline Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">대여 기간을 타임라인으로 시각화한 디자인입니다.</p>
            <div className="space-y-3 sm:space-y-4">
              <RentalTimelineCard data={sampleData} />
              <RentalTimelineCard data={confirmedData} />
              <RentalTimelineCard data={returnedData} />
            </div>
          </section>
        )}

        {/* Status Badge Style */}
        {(selectedStyle === 'all' || selectedStyle === 'badge') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Status Badge Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">상태를 강조한 배지 스타일의 디자인입니다.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <RentalStatusBadge data={sampleData} />
              <RentalStatusBadge data={confirmedData} />
              <RentalStatusBadge data={returnedData} />
            </div>
          </section>
        )}

        {/* Grid View Style */}
        {(selectedStyle === 'all' || selectedStyle === 'grid') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Grid View Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">그리드 레이아웃에 최적화된 컴팩트한 카드 디자인입니다.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              <RentalGridView data={sampleData} />
              <RentalGridView data={confirmedData} />
              <RentalGridView data={returnedData} />
            </div>
          </section>
        )}

        {/* Kanban Card Style */}
        {(selectedStyle === 'all' || selectedStyle === 'kanban') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Kanban Card Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">칸반 보드에 적합한 드래그 앤 드롭 카드 스타일입니다.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <RentalKanbanCard data={sampleData} />
              <RentalKanbanCard data={confirmedData} />
              <RentalKanbanCard data={returnedData} />
            </div>
          </section>
        )}

        {/* Hotel Style */}
        {(selectedStyle === 'all' || selectedStyle === 'hotel') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Hotel Booking Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">호텔 예약 사이트 스타일의 럭셔리한 디자인입니다.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <RentalHotelStyle data={sampleData} />
              <RentalHotelStyle data={confirmedData} />
              <RentalHotelStyle data={returnedData} />
            </div>
          </section>
        )}

        {/* Ticket Style */}
        {(selectedStyle === 'all' || selectedStyle === 'ticket') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Boarding Pass Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">항공권/보딩패스 스타일의 독창적인 디자인입니다.</p>
            <div className="space-y-4">
              <RentalTicketStyle data={sampleData} />
              <RentalTicketStyle data={confirmedData} />
              <RentalTicketStyle data={returnedData} />
            </div>
          </section>
        )}

        {/* Glass Morphism Style */}
        {(selectedStyle === 'all' || selectedStyle === 'glass') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Glass Morphism Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">글래스모피즘 효과의 모던하고 투명한 디자인입니다.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 rounded-2xl">
              <RentalGlassCard data={sampleData} />
              <RentalGlassCard data={confirmedData} />
              <RentalGlassCard data={returnedData} />
            </div>
          </section>
        )}

        {/* Action Card Style */}
        {(selectedStyle === 'all' || selectedStyle === 'action') && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Action-Focused Style</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">액션 버튼에 집중한 실용적인 디자인입니다.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <RentalActionCard data={sampleData} />
              <RentalActionCard data={confirmedData} />
              <RentalActionCard data={returnedData} />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}