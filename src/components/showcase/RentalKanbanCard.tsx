'use client'

import { Calendar, MapPin, User, Phone, Package, DollarSign, GripVertical, Clock } from 'lucide-react'

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

interface RentalKanbanCardProps {
  data: RentalData
  onClick?: () => void
  onDragStart?: () => void
}

export function RentalKanbanCard({ data, onClick, onDragStart }: RentalKanbanCardProps) {
  const priorityColor = () => {
    const today = new Date()
    const start = new Date(data.rental_start_date)
    const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diff <= 0) return 'border-l-red-500'
    if (diff <= 2) return 'border-l-orange-500'
    if (diff <= 7) return 'border-l-yellow-500'
    return 'border-l-green-500'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getDaysUntil = () => {
    const today = new Date()
    const start = new Date(data.rental_start_date)
    const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diff === 0) return '오늘'
    if (diff === 1) return '내일'
    if (diff < 0) return `${Math.abs(diff)}일 지남`
    return `${diff}일 후`
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${priorityColor()} p-3 hover:shadow-md transition-all cursor-pointer group`}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
    >
      {/* Drag Handle */}
      <div className="flex justify-between items-start mb-2">
        <GripVertical className="w-4 h-4 text-gray-300 cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-[10px] text-gray-400 font-mono">{data.id}</span>
      </div>

      {/* Customer Info */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-3 h-3 text-gray-600" />
          </div>
          <h3 className="font-semibold text-sm text-gray-900">{data.customer_name}</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 ml-8">
          <Phone className="w-3 h-3" />
          <span>{data.customer_phone}</span>
        </div>
      </div>

      {/* Equipment */}
      <div className="flex items-center gap-1 mb-2 text-xs">
        <Package className="w-3 h-3 text-gray-400" />
        <div className="flex gap-1 overflow-x-auto">
          {data.equipment_types.map((type, idx) => (
            <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded whitespace-nowrap">
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(data.rental_start_date)} - {formatDate(data.rental_end_date)}</span>
        </div>
      </div>

      {/* Locations */}
      <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
        <MapPin className="w-3 h-3 text-gray-400" />
        <span className="font-medium">{data.pickup_location}</span>
        <span className="text-gray-400">→</span>
        <span className="font-medium">{data.return_location}</span>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className={`font-medium ${
            getDaysUntil().includes('지남') ? 'text-red-600' :
            getDaysUntil() === '오늘' ? 'text-orange-600' :
            getDaysUntil() === '내일' ? 'text-yellow-600' :
            'text-gray-600'
          }`}>
            {getDaysUntil()}
          </span>
        </div>
        <span className="text-xs font-semibold text-gray-900">
          ₩{new Intl.NumberFormat('ko-KR').format(data.total_amount)}
        </span>
      </div>
    </div>
  )
}