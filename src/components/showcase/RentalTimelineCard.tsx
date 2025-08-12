'use client'

import { Calendar, Clock, MapPin, Package, Phone, AlertCircle } from 'lucide-react'

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

interface RentalTimelineCardProps {
  data: RentalData
  onClick?: () => void
}

export function RentalTimelineCard({ data, onClick }: RentalTimelineCardProps) {
  const statusConfig = {
    pending: { label: '픽업 대기', color: 'bg-yellow-400', textColor: 'text-yellow-600' },
    picked_up: { label: '대여 중', color: 'bg-blue-400', textColor: 'text-blue-600' },
    returned: { label: '반납 완료', color: 'bg-green-400', textColor: 'text-green-600' }
  }

  const calculateProgress = () => {
    const today = new Date()
    const start = new Date(data.rental_start_date)
    const end = new Date(data.rental_end_date)
    
    if (data.status === 'pending') return 0
    if (data.status === 'returned') return 100
    
    const total = end.getTime() - start.getTime()
    const elapsed = today.getTime() - start.getTime()
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100))
    
    return progress
  }

  const getRemainingDays = () => {
    const today = new Date()
    const end = new Date(data.rental_end_date)
    const diff = end.getTime() - today.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDay = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    return `${month}/${day}(${weekDay})`
  }

  const progress = calculateProgress()
  const remainingDays = getRemainingDays()

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer w-full"
      onClick={onClick}
    >
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{data.customer_name}</h3>
            <span className="text-[10px] sm:text-xs text-gray-500 font-mono">{data.id}</span>
          </div>
          <span className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${statusConfig[data.status].textColor} bg-white border ${statusConfig[data.status].textColor.replace('text', 'border')}`}>
            {statusConfig[data.status].label}
          </span>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        {/* Timeline Progress Bar */}
        <div className="relative mb-3 sm:mb-4">
          <div className="flex justify-between text-[10px] sm:text-xs text-gray-600 mb-2">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>{formatDate(data.rental_start_date)}</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>{formatDate(data.rental_end_date)}</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`absolute left-0 top-0 h-full ${statusConfig[data.status].color} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
            {/* Progress Indicator */}
            {data.status === 'picked_up' && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-sm"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            )}
          </div>

          {/* Timeline Labels */}
          <div className="flex justify-between mt-2">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-700">{data.pickup_location} 출고</span>
            </div>
            {data.status === 'picked_up' && remainingDays <= 2 && (
              <div className="flex items-center gap-0.5 sm:gap-1 absolute left-1/2 -translate-x-1/2">
                <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500" />
                <span className="text-[10px] sm:text-xs font-medium text-orange-600">D-{remainingDays}</span>
              </div>
            )}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-700">{data.return_location} 반납</span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-gray-700 truncate">{data.equipment_types[0]}</span>
            {data.equipment_types.length > 1 && (
              <span className="text-[10px] sm:text-xs text-gray-500">+{data.equipment_types.length - 1}</span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-gray-700">{data.customer_phone.slice(-4)}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm col-span-2 sm:col-span-1 sm:justify-end">
            <span className="font-semibold text-gray-900">
              ₩{new Intl.NumberFormat('ko-KR').format(data.total_amount)}
            </span>
          </div>
        </div>

        {/* Remaining Days Badge for Active Rentals */}
        {data.status === 'picked_up' && (
          <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <span className="text-xs sm:text-sm text-gray-600">잔여 기간</span>
              </div>
              <span className={`text-xs sm:text-sm font-semibold ${
                remainingDays <= 1 ? 'text-red-600' : 
                remainingDays <= 3 ? 'text-orange-600' : 
                'text-gray-900'
              }`}>
                {remainingDays}일
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}