'use client'

import { CalendarDays, MapPin, Phone, Package, CreditCard, Clock } from 'lucide-react'

interface RentalData {
  id: string
  customer_name: string
  customer_phone: string
  equipment_types: string[]
  rental_start_date: string
  rental_end_date: string
  pickup_location: string
  return_location: string
  status: 'pending' | 'picked_up' | 'returned'
  total_amount: number
  deposit_amount?: number
  notes?: string
}

interface RentalCompactCardProps {
  data: RentalData
  onPickup?: () => void
  onReturn?: () => void
  onClick?: () => void
}

export function RentalCompactCard({ data, onPickup, onReturn, onClick }: RentalCompactCardProps) {
  const statusConfig = {
    pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    picked_up: { label: '대여중', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    returned: { label: '반납완료', color: 'bg-green-100 text-green-800 border-green-200' }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount)
  }

  const getDaysRemaining = () => {
    const today = new Date()
    const endDate = new Date(data.rental_end_date)
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer w-full"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className="min-w-0 flex-1 mr-2">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{data.customer_name}</h3>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{data.id}</p>
        </div>
        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border whitespace-nowrap ${statusConfig[data.status].color}`}>
          {statusConfig[data.status].label}
        </span>
      </div>

      {/* Equipment */}
      <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600 mb-2">
        <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
        <span className="font-medium truncate">{data.equipment_types.join(', ')}</span>
      </div>

      {/* Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-2 sm:mb-3">
        <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm">
          <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-gray-700">
            {formatDate(data.rental_start_date)} - {formatDate(data.rental_end_date)}
          </span>
        </div>
        {data.status === 'picked_up' && (
          <div className="flex items-center gap-1 text-[10px] sm:text-xs">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-500 flex-shrink-0" />
            <span className="text-orange-600 font-medium">
              D-{getDaysRemaining()}
            </span>
          </div>
        )}
      </div>

      {/* Locations */}
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1 sm:gap-2 mb-2 sm:mb-3 text-[10px] sm:text-xs">
        <div className="flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500 flex-shrink-0" />
          <span className="text-gray-600">출고: <strong>{data.pickup_location}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500 flex-shrink-0" />
          <span className="text-gray-600">반납: <strong>{data.return_location}</strong></span>
        </div>
      </div>

      {/* Contact & Amount */}
      <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs">
          <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600">{data.customer_phone}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0 hidden sm:block" />
          <span className="text-xs sm:text-sm font-semibold text-gray-900">
            ₩{formatCurrency(data.total_amount)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {data.status === 'pending' && onPickup && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPickup()
          }}
          className="w-full mt-2 sm:mt-3 px-3 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
        >
          출고 처리
        </button>
      )}
      {data.status === 'picked_up' && onReturn && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onReturn()
          }}
          className="w-full mt-2 sm:mt-3 px-3 py-1.5 sm:py-2 bg-green-600 text-white text-xs sm:text-sm font-medium rounded hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation"
        >
          반납 처리
        </button>
      )}
    </div>
  )
}