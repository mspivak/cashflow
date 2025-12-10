import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import type { Cashflow, MemberRole } from "@/types"

interface CashflowContextValue {
  currentCashflow: Cashflow | null
  setCurrentCashflow: (cashflow: Cashflow | null) => void
  userRole: MemberRole | null
}

const CashflowContext = createContext<CashflowContextValue | null>(null)

const STORAGE_KEY = "cashflow_current_id"

export function CashflowProvider({
  children,
  cashflows,
}: {
  children: ReactNode
  cashflows: Cashflow[]
}) {
  const [currentCashflow, setCurrentCashflowState] = useState<Cashflow | null>(null)

  useEffect(() => {
    if (cashflows.length === 0) {
      setCurrentCashflowState(null)
      return
    }

    const savedId = localStorage.getItem(STORAGE_KEY)
    const saved = cashflows.find((c) => c.id === savedId)

    if (saved) {
      setCurrentCashflowState(saved)
    } else {
      setCurrentCashflowState(cashflows[0])
      localStorage.setItem(STORAGE_KEY, cashflows[0].id)
    }
  }, [cashflows])

  const setCurrentCashflow = (cashflow: Cashflow | null) => {
    setCurrentCashflowState(cashflow)
    if (cashflow) {
      localStorage.setItem(STORAGE_KEY, cashflow.id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const userRole = currentCashflow?.role ?? null

  return (
    <CashflowContext.Provider value={{ currentCashflow, setCurrentCashflow, userRole }}>
      {children}
    </CashflowContext.Provider>
  )
}

export function useCashflowContext() {
  const context = useContext(CashflowContext)
  if (!context) {
    throw new Error("useCashflowContext must be used within CashflowProvider")
  }
  return context
}
