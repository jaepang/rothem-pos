import React from 'react'
import { useOrderHistory } from './useOrderHistory'
// billboard.js 스타일 임포트만 유지
import 'billboard.js/dist/billboard.css'
import 'billboard.js/dist/theme/datalab.css'

// 주문 내역 컴포넌트
export const OrderHistory: React.FC = () => {
  // 커스텀 훅 사용
  const {
    orders,
    periodType,
    setPeriodType,
    loading,
    chartRef,
    chartData,
    periodLabel,
    totalSales,
    orderCount,
    averageOrderAmount,
    isNextButtonDisabled,
    movePeriod,
    handleExportExcel
  } = useOrderHistory()

  return (
    <div className="h-full max-h-screen overflow-y-auto overflow-x-hidden pb-10">
      {/* 주문 내역 타이틀과 기간 선택 컨트롤을 한 줄에 배치 */}
      <div className="relative flex flex-wrap items-center gap-4 bg-white p-4 mb-6">
        <div className="flex-none flex items-center space-x-4 z-10">
          <h2 className="text-2xl font-bold">주문 내역</h2>
          
          <div className="flex items-center space-x-2">
            <button
              className={`px-3 py-1.5 rounded-md ${
                periodType === 'day'
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setPeriodType('day')}
            >
              일별
            </button>
            <button
              className={`px-3 py-1.5 rounded-md ${
                periodType === 'week'
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setPeriodType('week')}
            >
              주별
            </button>
            <button
              className={`px-3 py-1.5 rounded-md ${
                periodType === 'month'
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setPeriodType('month')}
            >
              월별
            </button>
          </div>
        </div>
        
        {/* 날짜 이동 버튼들을 절대 위치로 중앙에 배치 */}
        <div className="absolute left-0 right-0 mx-auto flex justify-center items-center">
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
              className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 ml-2"
              onClick={() => movePeriod('today')}
            >
              오늘
            </button>
          </div>
        </div>
        
        <div className="flex-none ml-auto z-10">
          <button
            className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600"
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