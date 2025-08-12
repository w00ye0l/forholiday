'use client'

import { ChevronRight, Calendar, MapPin, User, Package } from 'lucide-react'

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

interface RentalMinimalListProps {
  data: RentalData
  onClick?: () => void
}

export function RentalMinimalList({ data, onClick }: RentalMinimalListProps) {
  const statusConfig = {
    pending: { label: '대기', color: 'bg-yellow-500' },
    picked_up: { label: '대여중', color: 'bg-blue-500' },
    returned: { label: '완료', color: 'bg-green-500' }
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`
    const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`
    return `${startStr} - ${endStr}`
  }

  const formatCurrency = (amount: number) => {
    return `₩${new Intl.NumberFormat('ko-KR').format(amount)}`
  }

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-2.5 sm:p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* First Row - Status, Name, Amount */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full ${statusConfig[data.status].color}`} />
              <span className="text-[9px] text-gray-500 mt-0.5">{statusConfig[data.status].label}</span>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">{data.customer_name}</p>
              <p className="text-[10px] text-gray-500">{data.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(data.total_amount)}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {/* Second Row - Equipment & Location */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1 text-gray-600">
            <Package className="w-3 h-3" />
            <span>{data.equipment_types[0]}</span>
            {data.equipment_types.length > 1 && (
              <span className="text-gray-400">+{data.equipment_types.length - 1}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-700 font-medium">{data.pickup_location}</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-700 font-medium">{data.return_location}</span>
          </div>
        </div>

        {/* Third Row - Date */}
        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-gray-600">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span>{formatDateRange(data.rental_start_date, data.rental_end_date)}</span>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex items-center justify-between">
        {/* Left Section - Status & Basic Info */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          {/* Status Indicator */}
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full ${statusConfig[data.status].color}`} />
            <span className="text-[10px] text-gray-500 mt-1">{statusConfig[data.status].label}</span>
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <div className="min-w-0">
              <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">{data.customer_name}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">{data.id}</p>
            </div>
          </div>

          {/* Equipment */}
          <div className="hidden lg:block px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
            {data.equipment_types.join(' · ')}
          </div>
        </div>

        {/* Middle Section - Date & Location */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Date Range */}
          <div className="hidden md:flex items-center gap-1.5">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              {formatDateRange(data.rental_start_date, data.rental_end_date)}
            </span>
          </div>

          {/* Locations */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />
              <span className="text-gray-700 font-medium">{data.pickup_location}</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500" />
              <span className="text-gray-700 font-medium">{data.return_location}</span>
            </div>
          </div>
        </div>

        {/* Right Section - Amount & Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
            {formatCurrency(data.total_amount)}
          </span>
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
        </div>
      </div>

      {/* Tablet Date Display */}
      <div className="hidden sm:flex md:hidden mt-2 items-center gap-1.5 text-xs text-gray-600">
        <Calendar className="w-3 h-3 text-gray-400" />
        <span>{formatDateRange(data.rental_start_date, data.rental_end_date)}</span>
      </div>
    </div>
  )
}