import { useState, useEffect, useMemo, useRef } from 'react'
import { OrderList } from '@/shared/types/order'
import {
  getOrdersByDate,
  getOrdersByWeek,
  getOrdersByMonth,
  exportOrdersToExcel
} from '@/shared/utils/order'
// billboard.js 가져오기
import bb, { line } from 'billboard.js'
import 'billboard.js/dist/billboard.css'
import 'billboard.js/dist/theme/datalab.css'

// 기간 타입 정의
export type PeriodType = 'day' | 'week' | 'month'

export const useOrderHistory = () => {
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
  const movePeriod = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setSelectedDate(new Date())
      // 오늘 버튼 클릭 시 즉시 데이터 로드
      setTimeout(() => loadOrders(), 0)
      return
    }
    
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

  // 차트 초기화 및 업데이트 함수
  const initializeChart = () => {
    if (chartRef.current) {
      // 기존 차트 destroy
      if (bbChart.current) {
        bbChart.current.destroy();
      }

      // CSS 스타일 추가
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .bb-line {
          stroke-width: 2px !important;
        }
      `;
      document.head.appendChild(styleEl);

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
            width: 4
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
  };

  // 차트 초기화 및 업데이트
  useEffect(() => {
    initializeChart();
  }, [chartData]);

  return {
    // 상태
    orders,
    periodType,
    setPeriodType,
    selectedDate,
    setSelectedDate,
    loading,
    chartRef,
    chartData,
    
    // 계산된 값
    periodLabel,
    totalSales,
    orderCount,
    averageOrderAmount,
    isNextButtonDisabled,
    
    // 동작 함수
    loadOrders,
    movePeriod,
    handleExportExcel
  }
} 