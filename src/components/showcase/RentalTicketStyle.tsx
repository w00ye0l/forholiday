'use client'

import { Plane, Clock, MapPin, User, Hash, Calendar, Package, QrCode } from 'lucide-react'

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

interface RentalTicketStyleProps {
  data: RentalData
  onClick?: () => void
}

export function RentalTicketStyle({ data, onClick }: RentalTicketStyleProps) {
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getDuration = () => {
    const start = new Date(data.rental_start_date)
    const end = new Date(data.rental_end_date)
    const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))
    return `${Math.floor(hours / 24)}일 ${hours % 24}시간`
  }

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={onClick}
    >
      {/* Boarding Pass Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="font-bold text-lg">Equipment Rental</span>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-90">예약번호</p>
            <p className="font-mono font-bold">{data.id}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Flight Info Style Layout */}
        <div className="grid grid-cols-5 gap-4 items-center mb-4">
          {/* Departure */}
          <div className="col-span-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{data.pickup_location}</p>
              <p className="text-xs text-gray-500 mb-1">출고지</p>
              <p className="text-sm font-medium">{formatDate(data.rental_start_date)}</p>
              <p className="text-xs text-gray-600">{formatTime(data.rental_start_date)}</p>
            </div>
          </div>

          {/* Flight Path */}
          <div className="col-span-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              <div className="flex-1 h-px bg-gray-300"></div>
              <div className="p-2">
                <Plane className="w-4 h-4 text-gray-400 rotate-90" />
              </div>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{getDuration()}</p>
          </div>

          {/* Arrival */}
          <div className="col-span-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{data.return_location}</p>
              <p className="text-xs text-gray-500 mb-1">반납지</p>
              <p className="text-sm font-medium">{formatDate(data.rental_end_date)}</p>
              <p className="text-xs text-gray-600">{formatTime(data.rental_end_date)}</p>
            </div>
          </div>
        </div>

        {/* Dashed Separator */}
        <div className="border-t border-dashed border-gray-300 my-4"></div>

        {/* Passenger & Seat Info */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">승객명 / PASSENGER</p>
            <p className="font-semibold text-gray-900">{data.customer_name}</p>
            <p className="text-xs text-gray-600">{data.customer_phone}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">장비 / EQUIPMENT</p>
            <div className="space-y-1">
              {data.equipment_types.map((type, idx) => (
                <p key={idx} className="text-sm font-medium text-gray-900">{type}</p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">요금 / FARE</p>
            <p className="text-lg font-bold text-gray-900">
              ₩{new Intl.NumberFormat('ko-KR').format(data.total_amount)}
            </p>
            {data.status === 'picked_up' && (
              <p className="text-xs text-green-600 font-medium">결제완료</p>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {data.status === 'pending' && (
              <>
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-sm text-yellow-700 font-medium">탑승 대기</span>
              </>
            )}
            {data.status === 'picked_up' && (
              <>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-700 font-medium">운항 중</span>
              </>
            )}
            {data.status === 'returned' && (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700 font-medium">도착 완료</span>
              </>
            )}
          </div>

          {/* QR Code Placeholder */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center">
              <QrCode className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-xs text-gray-500">모바일 탑승권</span>
          </div>
        </div>
      </div>

      {/* Ticket Perforations */}
      <div className="absolute left-0 top-16 w-full">
        <div className="flex justify-between px-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1 h-1 bg-gray-300 rounded-full"></div>
          ))}
        </div>
      </div>
    </div>
  )
}