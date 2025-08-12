'use client'

import { Play, Pause, CheckCircle, Clock, User, Package, MapPin, Calendar, Phone, CreditCard } from 'lucide-react'

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

interface RentalActionCardProps {
  data: RentalData
  onPrimaryAction?: () => void
  onSecondaryAction?: () => void
  onClick?: () => void
}

export function RentalActionCard({ data, onPrimaryAction, onSecondaryAction, onClick }: RentalActionCardProps) {
  const getActionConfig = () => {
    switch (data.status) {
      case 'pending':
        return {
          primaryLabel: '즉시 출고',
          primaryIcon: Play,
          primaryColor: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
          secondaryLabel: '시간 예약',
          secondaryIcon: Clock,
          secondaryColor: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
          bgColor: 'bg-gradient-to-br from-yellow-50 to-orange-50',
          borderColor: 'border-yellow-200'
        }
      case 'picked_up':
        return {
          primaryLabel: '반납 처리',
          primaryIcon: CheckCircle,
          primaryColor: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
          secondaryLabel: '연장 신청',
          secondaryIcon: Clock,
          secondaryColor: 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800',
          bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200'
        }
      case 'returned':
        return {
          primaryLabel: '정산 완료',
          primaryIcon: CheckCircle,
          primaryColor: 'bg-gray-400 cursor-not-allowed',
          secondaryLabel: '리뷰 작성',
          secondaryIcon: User,
          secondaryColor: 'bg-gray-500 hover:bg-gray-600',
          bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
          borderColor: 'border-green-200'
        }
    }
  }

  const config = getActionConfig()
  const PrimaryIcon = config.primaryIcon
  const SecondaryIcon = config.secondaryIcon

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUrgencyLevel = () => {
    const today = new Date()
    const start = new Date(data.rental_start_date)
    const hoursUntil = (start.getTime() - today.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntil <= 2) return 'urgent'
    if (hoursUntil <= 24) return 'soon'
    return 'normal'
  }

  const urgency = getUrgencyLevel()

  return (
    <div 
      className={`
        rounded-2xl border-2 ${config.borderColor} ${config.bgColor}
        p-6 hover:shadow-xl transition-all duration-300
        cursor-pointer relative overflow-hidden
        ${urgency === 'urgent' ? 'animate-pulse' : ''}
      `}
      onClick={onClick}
    >
      {/* Urgency Indicator */}
      {urgency === 'urgent' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
      )}
      {urgency === 'soon' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-orange-500" />
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center">
              <User className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{data.customer_name}</h3>
              <p className="text-sm text-gray-500 font-mono">{data.id}</p>
            </div>
          </div>
          
          {urgency === 'urgent' && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              긴급
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            ₩{new Intl.NumberFormat('ko-KR').format(data.total_amount)}
          </p>
          <p className="text-sm text-gray-500">총 대여료</p>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">{data.equipment_types.join(', ')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">{data.customer_phone}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">{data.pickup_location} → {data.return_location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">{formatDate(data.rental_start_date)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar for Active Rentals */}
      {data.status === 'picked_up' && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">대여 진행률</span>
            <span className="text-sm font-medium text-gray-900">65%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full w-[65%] transition-all duration-1000" />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (data.status !== 'returned' && onPrimaryAction) {
              onPrimaryAction()
            }
          }}
          className={`
            flex-1 py-4 px-6 rounded-xl font-semibold text-white
            flex items-center justify-center gap-2
            transition-all duration-200 transform
            hover:scale-105 active:scale-95
            ${config.primaryColor}
            ${data.status === 'returned' ? 'opacity-50' : 'shadow-lg hover:shadow-xl'}
          `}
          disabled={data.status === 'returned'}
        >
          <PrimaryIcon className="w-5 h-5" />
          {config.primaryLabel}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            if (onSecondaryAction) {
              onSecondaryAction()
            }
          }}
          className={`
            px-6 py-4 rounded-xl font-medium text-white
            flex items-center justify-center gap-2
            transition-all duration-200 transform
            hover:scale-105 active:scale-95
            ${config.secondaryColor}
            shadow-md hover:shadow-lg
          `}
        >
          <SecondaryIcon className="w-4 h-4" />
          {config.secondaryLabel}
        </button>
      </div>

      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
        <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 rounded-full transform rotate-45 scale-150" />
      </div>
    </div>
  )
}