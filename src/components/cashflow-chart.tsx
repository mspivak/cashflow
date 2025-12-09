import { useMemo } from "react"
import type { MonthData } from "@/types"

interface CashflowChartProps {
  months: MonthData[]
}

export function CashflowChart({ months }: CashflowChartProps) {
  const chartData = useMemo(() => {
    return months.map((month) => {
      let expectedIncome = 0
      let actualIncome = 0
      let expectedExpenses = 0
      let actualExpenses = 0

      for (const item of month.items) {
        const category = item.type === "entry" ? item.entry!.plan.category : item.plan!.category
        const amount = item.type === "entry" ? item.entry!.amount : item.plan!.expected_amount

        if (item.type === "entry") {
          if (category.type === "income") {
            actualIncome += amount
            expectedIncome += amount
          } else {
            actualExpenses += amount
            expectedExpenses += amount
          }
        } else {
          if (category.type === "income") {
            expectedIncome += amount
          } else {
            expectedExpenses += amount
          }
        }
      }

      return {
        expectedIncome,
        actualIncome,
        expectedExpenses,
        actualExpenses,
        cumulativeExpected: month.cumulativeExpected,
        cumulativeActual: month.cumulativeActual,
      }
    })
  }, [months])

  const maxIncome = Math.max(...chartData.map((d) => Math.max(d.expectedIncome, d.actualIncome)), 1)
  const maxExpense = Math.max(...chartData.map((d) => Math.max(d.expectedExpenses, d.actualExpenses)), 1)
  const maxCumulative = Math.max(
    ...chartData.map((d) => Math.max(Math.abs(d.cumulativeExpected), Math.abs(d.cumulativeActual))),
    1
  )

  const chartHeight = 120

  return (
    <div className="mb-4">
      <div className="flex gap-4 mb-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-green-500/50" />
          <span className="text-muted-foreground">Expected Income</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-green-500" />
          <span className="text-muted-foreground">Actual Income</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-red-500/50" />
          <span className="text-muted-foreground">Expected Expenses</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-red-500" />
          <span className="text-muted-foreground">Actual Expenses</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Cumulative</span>
        </div>
      </div>

      <div className="flex gap-2" style={{ height: chartHeight }}>
        {chartData.map((data, i) => {
          const expIncomeHeight = (data.expectedIncome / maxIncome) * (chartHeight * 0.4)
          const actIncomeHeight = (data.actualIncome / maxIncome) * (chartHeight * 0.4)
          const expExpenseHeight = (data.expectedExpenses / maxExpense) * (chartHeight * 0.4)
          const actExpenseHeight = (data.actualExpenses / maxExpense) * (chartHeight * 0.4)
          const cumulativeY = ((maxCumulative - data.cumulativeExpected) / (maxCumulative * 2)) * chartHeight

          return (
            <div
              key={i}
              className="flex-1 min-w-32 relative flex items-end justify-center gap-0.5 bg-muted/20 rounded-sm"
            >
              <div
                className="w-1.5 bg-green-500/50 rounded-t-sm transition-all"
                style={{ height: Math.max(expIncomeHeight, data.expectedIncome > 0 ? 2 : 0) }}
                title={`Expected Income: $${data.expectedIncome.toLocaleString()}`}
              />
              <div
                className="w-1.5 bg-green-500 rounded-t-sm transition-all"
                style={{ height: Math.max(actIncomeHeight, data.actualIncome > 0 ? 2 : 0) }}
                title={`Actual Income: $${data.actualIncome.toLocaleString()}`}
              />
              <div
                className="w-1.5 bg-red-500/50 rounded-t-sm transition-all"
                style={{ height: Math.max(expExpenseHeight, data.expectedExpenses > 0 ? 2 : 0) }}
                title={`Expected Expenses: $${data.expectedExpenses.toLocaleString()}`}
              />
              <div
                className="w-1.5 bg-red-500 rounded-t-sm transition-all"
                style={{ height: Math.max(actExpenseHeight, data.actualExpenses > 0 ? 2 : 0) }}
                title={`Actual Expenses: $${data.actualExpenses.toLocaleString()}`}
              />
              <div
                className="absolute w-2 h-2 bg-amber-500 rounded-full border border-white shadow-sm transition-all"
                style={{ top: cumulativeY, left: "50%", transform: "translateX(-50%)" }}
                title={`Cumulative: $${data.cumulativeExpected.toLocaleString()}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
