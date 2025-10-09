import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import type { NewTransactionSchema } from './schema'

interface TransactionDrawerContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
  form: UseFormReturn<NewTransactionSchema> | null
  setForm: (form: UseFormReturn<NewTransactionSchema>) => void
  isDirty: boolean
  setIsDirty: (dirty: boolean) => void
  isResetting: boolean
  setIsResetting: (resetting: boolean) => void
  transactionData: any | null
  setTransactionData: (data: any) => void
}

const TransactionDrawerContext = createContext<TransactionDrawerContextType | null>(null)

export function TransactionDrawerProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('form')
  const formRef = useRef<UseFormReturn<NewTransactionSchema> | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [transactionData, setTransactionData] = useState<any | null>(null)

  const setForm = useCallback((form: UseFormReturn<NewTransactionSchema>) => {
    formRef.current = form
  }, [])

  const value: TransactionDrawerContextType = {
    activeTab,
    setActiveTab,
    form: formRef.current,
    setForm,
    isDirty,
    setIsDirty,
    isResetting,
    setIsResetting,
    transactionData,
    setTransactionData,
  }

  return (
    <TransactionDrawerContext.Provider value={value}>{children}</TransactionDrawerContext.Provider>
  )
}

export function useTransactionDrawer() {
  const context = useContext(TransactionDrawerContext)
  if (!context) {
    throw new Error('useTransactionDrawer must be used within a TransactionDrawerProvider')
  }
  return context
}
