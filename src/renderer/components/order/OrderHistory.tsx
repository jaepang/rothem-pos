import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Order, OrderList } from '@/shared/types/order'
import {
  getOrders,
  getOrdersByDate,
  getOrdersByWeek,
  getOrdersByMonth,
  exportOrdersToExcel
} from '@/shared/utils/order'
// billboard.js 가져오기 - 모듈 방식으로 수정
import bb, { line } from 'billboard.js'
import 'billboard.js/dist/billboard.css'
// billboard.js 필요한 모듈 명시적으로 import
import 'billboard.js/dist/theme/datalab.css'

// 기간 타입 정의
type PeriodType = 'day' | 'week' | 'month'

// 주문 내역 컴포넌트
export const OrderHistory: React.FC = () => {
  // 상태 관리
  const [orders, setOrders] = useState<OrderList>([])
  const [periodType, setPeriodType] = useState<PeriodType>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState<boolean>(true)
  const chartRef = useRef<HTMLDivElement>(null)
  const bbChart = useRef<any>(null) // 빌보드 차트 인스턴스

  // 항상 현재 날짜를 기준으로 시작
  useEffect(() => {
    const today = new Date()
    setSelectedDate(today)
  }, [])

  // 선택된 날짜를 기준으로 시작일과 종료일 계산
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const today = new Date(selectedDate)
    
    if (periodType === 'day') {
      today.setHours(0, 0, 0, 0)
      const end = new Date(today)
      end.setHours(23, 59, 59, 999)
      
      const dateStr = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      return {
        periodStart: today,
        periodEnd: end,
        periodLabel: dateStr
      }
    }
    
    if (periodType === 'week') {
      const day = today.getDay() // 0(일요일) ~ 6(토요일)
      const start = new Date(today)
      start.setDate(today.getDate() - day) // 이번 주 일요일
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(start)
      end.setDate(start.getDate() + 6) // 이번 주 토요일
      end.setHours(23, 59, 59, 999)
      
      const startStr = start.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric'
      })
      
      const endStr = end.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric'
      })
      
      return {
        periodStart: start,
        periodEnd: end,
        periodLabel: `${startStr} ~ ${endStr}`
      }
    }
    
    // 월별 보기
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
    
    const monthStr = today.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long'
    })
    
    return {
      periodStart: start,
      periodEnd: end,
      periodLabel: monthStr
    }
  }, [selectedDate, periodType])

  // 기간별 총 매출액 계산
  const totalSales = useMemo(() => {
    return orders.reduce((sum, order) => {
      if (order.status === 'completed') {
        return sum + order.totalAmount
      }
      return sum
    }, 0)
  }, [orders])

  // 주문 수 계산
  const orderCount = useMemo(() => {
    return orders.filter(order => order.status === 'completed').length
  }, [orders])

  // 평균 주문 금액 계산
  const averageOrderAmount = useMemo(() => {
    if (orderCount === 0) return 0
    return Math.round(totalSales / orderCount)
  }, [totalSales, orderCount])

  // 주문 데이터 로딩 함수
  const loadOrders = async () => {
    setLoading(true)
    
    try {
      let result: OrderList = []
      
      if (periodType === 'day') {
        result = await getOrdersByDate(selectedDate)
      } else if (periodType === 'week') {
        result = await getOrdersByWeek(selectedDate)
      } else if (periodType === 'month') {
        result = await getOrdersByMonth(selectedDate)
      }
      
      // 주문 시간 순으로 정렬
      result.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      
      setOrders(result)
    } catch (error) {
      console.error('주문 데이터 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 날짜 이동 함수
  const movePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (periodType === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (periodType === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else if (periodType === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    
    // 오늘보다 미래의 날짜인 경우 이동 불가
    if (direction === 'next') {
      // 선택된 날짜의 시작 시간 기준으로 비교
      const startOfNew = new Date(newDate)
      
      if (periodType === 'day') {
        startOfNew.setHours(0, 0, 0, 0)
        if (startOfNew > today) return
      } else if (periodType === 'week') {
        const day = startOfNew.getDay()
        startOfNew.setDate(startOfNew.getDate() - day) // 주의 시작일(일요일)
        startOfNew.setHours(0, 0, 0, 0)
        
        const todayWeekStart = new Date(today)
        const todayDay = todayWeekStart.getDay()
        todayWeekStart.setDate(today.getDate() - todayDay) // 오늘이 속한 주의 시작일
        
        if (startOfNew > todayWeekStart) return
      } else if (periodType === 'month') {
        startOfNew.setDate(1) // 월의 시작일
        startOfNew.setHours(0, 0, 0, 0)
        
        const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        
        if (startOfNew > todayMonthStart) return
      }
    }
    
    setSelectedDate(newDate)
  }

  // 다음 버튼 비활성화 여부 계산
  const isNextButtonDisabled = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const compareDate = new Date(selectedDate)
    
    if (periodType === 'day') {
      compareDate.setHours(0, 0, 0, 0)
      compareDate.setDate(compareDate.getDate() + 1)
      return compareDate > today
    } else if (periodType === 'week') {
      const day = compareDate.getDay()
      compareDate.setDate(compareDate.getDate() - day) // 주의 시작일(일요일)
      compareDate.setHours(0, 0, 0, 0)
      compareDate.setDate(compareDate.getDate() + 7) // 다음 주 시작일
      
      const todayWeekStart = new Date(today)
      const todayDay = todayWeekStart.getDay()
      todayWeekStart.setDate(today.getDate() - todayDay) // 오늘이 속한 주의 시작일
      
      return compareDate > todayWeekStart
    } else if (periodType === 'month') {
      const nextMonth = new Date(compareDate.getFullYear(), compareDate.getMonth() + 1, 1)
      nextMonth.setHours(0, 0, 0, 0)
      
      const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      
      return nextMonth > todayMonth
    }
    
    return false
  }, [selectedDate, periodType])

  // 날짜별 차트 데이터 준비
  const chartData = useMemo(() => {
    if (periodType === 'day') {
      // 하루 내 시간별 매출
      const hourlyData: { [hour: string]: number } = {}
      
      // 시간별 매출 집계
      orders.forEach(order => {
        if (order.status === 'completed') {
          const orderDate = new Date(order.orderDate)
          const hour = orderDate.getHours()
          const hourStr = hour < 10 ? `0${hour}:00` : `${hour}:00`
          
          hourlyData[hourStr] = (hourlyData[hourStr] || 0) + order.totalAmount
        }
      })
      
      // 시간 순으로 정렬해서 반환 (0원인 데이터는 필터링)
      return Object.entries(hourlyData)
        .filter(([_, amount]) => amount > 0)
        .map(([time, amount]) => ({ time, amount }))
        .sort((a, b) => {
          // 시간 문자열 비교로 정렬 ("00:00", "01:00", ...)
          return a.time.localeCompare(b.time)
        })
    }
    
    if (periodType === 'week') {
      // 주간 일별 매출
      const days = ['일', '월', '화', '수', '목', '금', '토']
      const dayOrder = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 }
      const dailyData: { [day: string]: number } = {}
      
      // 요일별 매출 집계
      orders.forEach(order => {
        if (order.status === 'completed') {
          const orderDate = new Date(order.orderDate)
          const day = days[orderDate.getDay()]
          dailyData[day] = (dailyData[day] || 0) + order.totalAmount
        }
      })
      
      // 요일 순서대로 반환 (0원인 데이터는 필터링)
      return days
        .filter(day => (dailyData[day] || 0) > 0)
        .map(day => ({ time: day, amount: dailyData[day] || 0 }))
    }
    
    // 월별 일자별 매출
    const dailyData: { [day: string]: number } = {}
    
    // 일별 매출 집계
    orders.forEach(order => {
      if (order.status === 'completed') {
        const orderDate = new Date(order.orderDate)
        const day = orderDate.getDate()
        dailyData[`${day}일`] = (dailyData[`${day}일`] || 0) + order.totalAmount
      }
    })
    
    // 날짜 순으로 정렬해서 반환 (0원인 데이터는 필터링)
    return Object.entries(dailyData)
      .filter(([_, amount]) => amount > 0)
      .map(([day, amount]) => ({ time: day, amount }))
      .sort((a, b) => {
        // 숫자 추출 후 비교 ("1일" -> 1, "2일" -> 2, ...)
        const numA = parseInt(a.time, 10)
        const numB = parseInt(b.time, 10)
        return numA - numB
      })
  }, [orders, periodType, selectedDate])

  // 엑셀 내보내기 함수
  const handleExportExcel = () => {
    try {
      exportOrdersToExcel(orders)
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error)
      alert('엑셀 내보내기에 실패했습니다.')
    }
  }

  // 기간 타입 변경 시 주문 데이터 다시 로드
  useEffect(() => {
    loadOrders()
  }, [periodType, selectedDate])

  // 차트 초기화 및 업데이트
  useEffect(() => {
    if (chartRef.current) {
      // 기존 차트 destroy
      if (bbChart.current) {
        bbChart.current.destroy();
      }

      // 차트 데이터가 있을 때
      if (chartData.length > 0) {
        // x축 카테고리 및 데이터 값 준비
        const categories = chartData.map(d => d.time);
        const values = chartData.map(d => d.amount);

        // 차트 생성
        bbChart.current = bb.generate({
          bindto: chartRef.current,
          data: {
            x: "x",
            columns: [
              ["x", ...categories],
              ["매출", ...values]
            ],
            type: line(),
            colors: {
              "매출": "#3b82f6"
            }
          },
          point: {
            r: 3,
            focus: {
              expand: {
                r: 4
              }
            }
          },
          line: {
            // @ts-ignore
            width: 2
          },
          axis: {
            x: {
              type: "category",
              tick: {
                format: function(index: number) {
                  return categories[index];
                }
              }
            },
            y: {
              tick: {
                format: function(value: number) {
                  return value >= 10000 
                    ? `${Math.floor(value / 10000)}만` 
                    : value.toLocaleString();
                }
              }
            }
          },
          grid: {
            y: {
              show: true
            }
          },
          padding: {
            top: 20,
            right: 40,
            bottom: 40,
            left: 60
          },
          tooltip: {
            format: {
              value: function(value) {
                return `${value.toLocaleString()}원`;
              }
            }
          },
          transition: {
            duration: 300
          }
        });
      } else {
        // 데이터가 없을 때 빈 차트 생성
        bbChart.current = bb.generate({
          bindto: chartRef.current,
          data: {
            x: "x",
            columns: [
              ["x", "데이터 없음"],
              ["매출", 0]
            ],
            type: line(),
            colors: {
              "매출": "#3b82f6"
            }
          },
          axis: {
            x: {
              type: "category"
            },
            y: {
              tick: {
                format: function(value: number) {
                  return value.toLocaleString();
                }
              },
              min: 0,
              padding: {
                bottom: 0
              }
            }
          },
          grid: {
            y: {
              show: true
            }
          },
          padding: {
            top: 20,
            right: 40,
            bottom: 40,
            left: 60
          },
          legend: {
            show: false
          },
          tooltip: {
            show: false
          }
        });
      }
    }
  }, [chartData]);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">주문 내역</h2>
      
      {/* 기간 선택 컨트롤 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              className={`px-4 py-2 rounded-md ${
                periodType === 'day'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setPeriodType('day')}
            >
              일별
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                periodType === 'week'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setPeriodType('week')}
            >
              주별
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                periodType === 'month'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setPeriodType('month')}
            >
              월별
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              className="p-2 rounded-md bg-gray-200 hover:bg-gray-300"
              onClick={() => movePeriod('prev')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
              </svg>
            </button>
            <span className="text-lg font-medium">{periodLabel}</span>
            <button
              className={`p-2 rounded-md ${
                isNextButtonDisabled 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              onClick={() => !isNextButtonDisabled && movePeriod('next')}
              disabled={isNextButtonDisabled}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ml-4"
              onClick={() => setSelectedDate(new Date())}
            >
              오늘
            </button>
          </div>
          
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            onClick={handleExportExcel}
          >
            엑셀 내보내기
          </button>
        </div>
      </div>
      
      {/* 매출 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500 mb-2">총 매출</h3>
          <p className="text-3xl font-bold">{totalSales.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500 mb-2">주문 수</h3>
          <p className="text-3xl font-bold">{orderCount}건</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500 mb-2">평균 주문 금액</h3>
          <p className="text-3xl font-bold">{averageOrderAmount.toLocaleString()}원</p>
        </div>
      </div>
      
      {/* 매출 차트 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">매출 추이</h3>
          {chartData.length > 0 && (
            <div className="text-sm text-gray-500">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
              완료된 주문 매출
            </div>
          )}
        </div>
        
        <div className="h-96" ref={chartRef}>
          {/* 차트가 렌더링될 영역 */}
        </div>
      </div>
      
      {/* 주문 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h3 className="text-xl font-bold p-4 border-b">주문 목록</h3>
        
        {loading ? (
          <div className="p-10 text-center">
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문 번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문 시간</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.orderDate).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <ul>
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            {item.menuItem.displayName || item.menuItem.name} x {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {order.totalAmount.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status === 'completed' ? '완료' : order.status === 'cancelled' ? '취소' : '대기중'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <p className="text-gray-500">주문 내역이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
} 