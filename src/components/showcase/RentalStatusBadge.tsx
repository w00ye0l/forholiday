'use client'

import { Calendar, MapPin, Phone, Package, Banknote, ArrowRight, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

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

interface RentalStatusBadgeProps {
  data: RentalData
  onAction?: () => void
  onClick?: () => void
}

export function RentalStatusBadge({ data, onAction, onClick }: RentalStatusBadgeProps) {
  const statusConfig = {
    pending: { 
      label: '픽업 대기중', 
      icon: Clock,
      bgColor: 'bg-gradient-to-r from-yellow-50 to-orange-50',
      borderColor: 'border-yellow-300',
      badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      iconColor: 'text-yellow-600',
      actionLabel: '출고 처리',
      actionColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    picked_up: { 
      label: '대여 진행중', 
      icon: AlertCircle,
      bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      borderColor: 'border-blue-300',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      iconColor: 'text-blue-600',
      actionLabel: '반납 처리',
      actionColor: 'bg-blue-600 hover:bg-blue-700'
    },
    returned: { 
      label: '반납 완료', 
      icon: CheckCircle,
      bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
      borderColor: 'border-green-300',
      badgeColor: 'bg-green-100 text-green-800 border-green-300',
      iconColor: 'text-green-600',
      actionLabel: '',
      actionColor: ''
    }
  }

  const config = statusConfig[data.status]
  const StatusIcon = config.icon

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const getDaysInfo = () => {
    const today = new Date()
    const start = new Date(data.rental_start_date)
    const end = new Date(data.rental_end_date)
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const remainingDays = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    const elapsedDays = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    
    return { totalDays, remainingDays, elapsedDays }
  }

  const { totalDays, remainingDays, elapsedDays } = getDaysInfo()

  return (
    <div 
      className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} overflow-hidden hover:shadow-lg transition-all cursor-pointer w-full`}
      onClick={onClick}
    >
      {/* Status Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white/70 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <StatusIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.iconColor}`} />
            <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${config.badgeColor}`}>
              {config.label}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-gray-500 font-mono truncate ml-2">{data.id}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 sm:p-4">
        {/* Customer & Equipment */}
        <div className="flex justify-between items-start mb-2.5 sm:mb-3">
          <div className="min-w-0 flex-1 mr-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-lg truncate">{data.customer_name}</h3>
            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-600">{data.customer_phone}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/80 rounded-lg">
            <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[80px] sm:max-w-none">
              {data.equipment_types.join(', ')}
            </span>
          </div>
        </div>

        {/* Date & Location Info */}
        <div className="space-y-1.5 sm:space-y-2 mb-2.5 sm:mb-3">
          {/* Date Range */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/60 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-700">
              {formatDate(data.rental_start_date)} - {formatDate(data.rental_end_date)}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-500 ml-auto">
              ({totalDays}일간)
            </span>
          </div>

          {/* Location Flow */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/60 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
            <div className="flex items-center gap-1 sm:gap-2 flex-1">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">{data.pickup_location}</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">{data.return_location}</span>
            </div>
          </div>
        </div>

        {/* Status-specific Info */}
        {data.status === 'picked_up' && (
          <div className="flex items-center justify-between bg-blue-100/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 mb-2.5 sm:mb-3">
            <span className="text-xs sm:text-sm text-blue-900 font-medium">진행 상황</span>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-xs text-blue-700">
                {elapsedDays}일 경과
              </span>
              <span className={`text-xs sm:text-sm font-bold ${
                remainingDays <= 1 ? 'text-red-600' : 
                remainingDays <= 3 ? 'text-orange-600' : 
                'text-blue-800'
              }`}>
                D-{remainingDays}
              </span>
            </div>
          </div>
        )}

        {/* Amount & Action */}
        <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-gray-200/50">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm sm:text-lg font-bold text-gray-900">
              ₩{new Intl.NumberFormat('ko-KR').format(data.total_amount)}
            </span>
          </div>
          
          {data.status !== 'returned' && onAction && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAction()
              }}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors touch-manipulation ${config.actionColor}`}
            >
              {config.actionLabel}
            </button>
          )}
          
          {data.status === 'returned' && (
            <div className="flex items-center gap-1 sm:gap-1.5 text-green-600">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">정산 완료</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}