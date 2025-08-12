'use client'

import { Star, MapPin, Calendar, Users, Wifi, Car, Coffee, Luggage, ArrowRight, Clock } from 'lucide-react'

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

interface RentalHotelStyleProps {
  data: RentalData
  onClick?: () => void
  onBook?: () => void
}

export function RentalHotelStyle({ data, onClick, onBook }: RentalHotelStyleProps) {
  const calculateNights = () => {
    const start = new Date(data.rental_start_date)
    const end = new Date(data.rental_end_date)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatFullDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    })
  }

  const getEquipmentIcon = (type: string) => {
    if (type.includes('노트북')) return '💻'
    if (type.includes('태블릿')) return '📱'
    if (type.includes('카메라')) return '📷'
    if (type.includes('와이파이')) return '📶'
    return '📦'
  }

  const nights = calculateNights()
  const dailyRate = Math.floor(data.total_amount / nights)

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Image Section - Gradient placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600">
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          {data.status === 'pending' && (
            <span className="px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
              예약 대기
            </span>
          )}
          {data.status === 'picked_up' && (
            <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
              이용 중
            </span>
          )}
          {data.status === 'returned' && (
            <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
              이용 완료
            </span>
          )}
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur rounded-lg px-3 py-2">
          <p className="text-xs text-gray-600">총 {nights}박</p>
          <p className="text-xl font-bold text-gray-900">₩{new Intl.NumberFormat('ko-KR').format(data.total_amount)}</p>
          <p className="text-xs text-gray-500">₩{new Intl.NumberFormat('ko-KR').format(dailyRate)}/박</p>
        </div>

        {/* Equipment Icons */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          {data.equipment_types.map((type, idx) => (
            <div key={idx} className="w-10 h-10 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-lg">
              {getEquipmentIcon(type)}
            </div>
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Title & Customer */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-gray-900">{data.customer_name}님 예약</h3>
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map((star) => (
                <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500">예약번호: {data.id}</p>
        </div>

        {/* Date Information */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">체크인</p>
              <p className="text-sm font-semibold text-gray-900">{formatFullDate(data.rental_start_date)}</p>
              <p className="text-xs text-gray-600 mt-1">15:00부터</p>
            </div>
            <div className="flex flex-col items-center">
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">{nights}박</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">체크아웃</p>
              <p className="text-sm font-semibold text-gray-900">{formatFullDate(data.rental_end_date)}</p>
              <p className="text-xs text-gray-600 mt-1">11:00까지</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{data.pickup_location} Terminal</p>
              <p className="text-xs text-gray-500">픽업 & 반납: {data.return_location}</p>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Wifi className="w-3.5 h-3.5" />
            <span>WiFi</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Car className="w-3.5 h-3.5" />
            <span>픽업</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Coffee className="w-3.5 h-3.5" />
            <span>서비스</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Luggage className="w-3.5 h-3.5" />
            <span>보관</span>
          </div>
        </div>

        {/* Action Button */}
        {data.status === 'pending' && onBook && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onBook()
            }}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            예약 확정하기
          </button>
        )}
        
        {data.status === 'picked_up' && (
          <div className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 font-medium rounded-xl">
            <Clock className="w-4 h-4" />
            <span>현재 이용 중</span>
          </div>
        )}
        
        {data.status === 'returned' && (
          <div className="text-center py-3 bg-gray-100 text-gray-600 rounded-xl">
            <span className="text-sm">이용해 주셔서 감사합니다</span>
          </div>
        )}
      </div>
    </div>
  )
}