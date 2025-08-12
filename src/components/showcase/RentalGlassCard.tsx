'use client'

import { Calendar, MapPin, User, Package, Clock, Star, ArrowRight } from 'lucide-react'

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

interface RentalGlassCardProps {
  data: RentalData
  onClick?: () => void
}

export function RentalGlassCard({ data, onClick }: RentalGlassCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getDaysLeft = () => {
    const today = new Date()
    const end = new Date(data.rental_end_date)
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const statusConfig = {
    pending: {
      bg: 'from-amber-400/20 to-orange-500/20',
      border: 'border-amber-200/50',
      glow: 'shadow-amber-500/20'
    },
    picked_up: {
      bg: 'from-blue-400/20 to-indigo-500/20',
      border: 'border-blue-200/50',
      glow: 'shadow-blue-500/20'
    },
    returned: {
      bg: 'from-emerald-400/20 to-green-500/20',
      border: 'border-emerald-200/50',
      glow: 'shadow-emerald-500/20'
    }
  }

  const config = statusConfig[data.status]

  return (
    <div 
      className={`
        relative overflow-hidden rounded-2xl border ${config.border}
        bg-gradient-to-br ${config.bg}
        backdrop-blur-xl backdrop-saturate-150
        shadow-xl ${config.glow}
        hover:shadow-2xl hover:scale-[1.02]
        transition-all duration-300
        cursor-pointer group
      `}
      onClick={onClick}
    >
      {/* Glass Overlay Effect */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 p-6">
        {/* Floating Elements */}
        <div className="absolute top-4 right-4 opacity-20">
          <div className="w-16 h-16 rounded-full bg-white/30 blur-xl" />
        </div>
        <div className="absolute bottom-8 left-8 opacity-10">
          <div className="w-24 h-24 rounded-full bg-white/40 blur-2xl" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white drop-shadow-sm">{data.customer_name}</h3>
              <p className="text-sm text-white/80 font-mono">{data.id}</p>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                data.status === 'pending' ? 'bg-amber-400' :
                data.status === 'picked_up' ? 'bg-blue-400' :
                'bg-emerald-400'
              } animate-pulse`} />
              <span className="text-xs font-medium text-white">
                {data.status === 'pending' ? '대기' :
                 data.status === 'picked_up' ? '진행' : '완료'}
              </span>
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-white/80" />
            <span className="text-sm text-white/80 font-medium">장비</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.equipment_types.map((type, idx) => (
              <span 
                key={idx} 
                className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm font-medium"
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Date & Location */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/80">기간</span>
            </div>
            <div className="text-white">
              <p className="font-semibold">{formatDate(data.rental_start_date)}</p>
              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-white/30" />
                <ArrowRight className="w-3 h-3 text-white/60" />
                <div className="flex-1 h-px bg-white/30" />
              </div>
              <p className="font-semibold">{formatDate(data.rental_end_date)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/80">위치</span>
            </div>
            <div className="text-white">
              <p className="text-sm">{data.pickup_location}</p>
              <ArrowRight className="w-3 h-3 text-white/60 my-1" />
              <p className="text-sm">{data.return_location}</p>
            </div>
          </div>
        </div>

        {/* Progress & Amount */}
        {data.status === 'picked_up' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/80" />
                <span className="text-sm text-white/80">남은 시간</span>
              </div>
              <span className="text-white font-bold">{getDaysLeft()}일</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-white/60 to-white/80 rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(20, 100 - (getDaysLeft() * 10))}%` }}
              />
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map((star) => (
              <Star key={star} className="w-3 h-3 fill-white/60 text-white/60" />
            ))}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white drop-shadow-sm">
              ₩{new Intl.NumberFormat('ko-KR').format(data.total_amount)}
            </p>
            <p className="text-xs text-white/80">총 대여료</p>
          </div>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
        </div>
      </div>
    </div>
  )
}