import { useState, useEffect } from 'react'
import { initializePrinter, getPrinterStatus } from '@/shared/utils/printer'

export const usePrinter = () => {
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false)
  
  useEffect(() => {
    initPrinter()
  }, [])
  
  const initPrinter = async () => {
    await initializePrinter()
    const status = await getPrinterStatus()
    setIsPrinterConnected(status)
  }
  
  return {
    isPrinterConnected
  }
} 