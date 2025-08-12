'use client'

import { Calendar, MapPin, User, Package, Clock, CreditCard, MoreVertical } from 'lucide-react'

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

interface RentalGridViewProps {
  data: RentalData
  onClick?: () => void
  onAction?: () => void
}

export function RentalGridView({ data, onClick, onAction }: RentalGridViewProps) {
  const statusConfig = {
    pending: { 
      label: '대기', 
      dot: 'bg-yellow-400',
      bg: 'bg-yellow-50',
      text: 'text-yellow-700'
    },
    picked_up: { 
      label: '진행', 
      dot: 'bg-blue-400',
      bg: 'bg-blue-50',
      text: 'text-blue-700'
    },
    returned: { 
      label: '완료', 
      dot: 'bg-green-400',
      bg: 'bg-green-50',
      text: 'text-green-700'
    }
  }

  const config = statusConfig[data.status]

  const getDaysLeft = () => {
    const today = new Date()
    const end = new Date(data.rental_end_date)
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', { 
      month: 'numeric', 
      day: 'numeric' 
    })
  }

  return (
    <div 
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Status Bar */}
      <div className={`h-1 ${config.dot}`} />
      
      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${config.bg} ${config.text} flex items-center justify-center text-xs font-bold`}>
              {data.customer_name[0]}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{data.customer_name}</p>
              <p className="text-[10px] text-gray-500">{data.id}</p>
            </div>
          </div>
          <button 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              // 더보기 메뉴
            }}
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Equipment Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {data.equipment_types.map((type, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {type}
            </span>
          ))}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(data.rental_start_date)}-{formatDate(data.rental_end_date)}</span>
          </div>
          
          <div className="flex items-center gap-1 text-gray-600">
            <MapPin className="w-3 h-3" />
            <span>{data.pickup_location}→{data.return_location}</span>
          </div>
          
          <div className="flex items-center gap-1 text-gray-600">
            <CreditCard className="w-3 h-3" />
            <span className="font-semibold">₩{new Intl.NumberFormat('ko-KR').format(data.total_amount)}</span>
          </div>
          
          {data.status === 'picked_up' && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-orange-500" />
              <span className="text-orange-600 font-semibold">D-{getDaysLeft()}</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </span>
            
            {onAction && data.status !== 'returned' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAction()
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {data.status === 'pending' ? '출고' : '반납'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}