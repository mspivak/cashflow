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
          <div className="w-2 h-2 rounded-sm bg-green-500/40" />
          <span className="text-muted-foreground">Expected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-green-600" />
          <span className="text-muted-foreground">Actual</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Cumulative</span>
        </div>
      </div>

      <div className="relative" style={{ height: chartHeight }}>
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 100 ${chartHeight}`}
          preserveAspectRatio="none"
        >
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            points={chartData
              .map((data, i) => {
                const x = (i + 0.5) / chartData.length * 100
                const y = ((maxCumulative - data.cumulativeExpected) / (maxCumulative * 2)) * chartHeight + 4
                return `${x},${y}`
              })
              .join(" ")}
          />
        </svg>
        <div className="flex gap-2 h-full">
          {chartData.map((data, i) => {
            const maxValue = Math.max(maxIncome, maxExpense)
            const expIncomeHeight = (data.expectedIncome / maxValue) * (chartHeight * 0.9)
            const expExpenseHeight = (data.expectedExpenses / maxValue) * (chartHeight * 0.9)

            return (
              <div
                key={i}
                className="flex-1 min-w-32 relative flex items-end justify-center gap-2 bg-muted/20 rounded-sm"
              >
                <div
                  className="w-4 relative rounded-t-sm transition-all"
                  style={{ height: Math.max(expIncomeHeight, data.expectedIncome > 0 ? 2 : 0) }}
                  title={`Income - Expected: $${data.expectedIncome.toLocaleString()}, Actual: $${data.actualIncome.toLocaleString()}`}
                >
                  <div className="absolute inset-0 bg-green-500/40 rounded-t-sm" />
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-green-600 rounded-t-sm transition-all"
                    style={{ height: expIncomeHeight > 0 ? `${(data.actualIncome / data.expectedIncome) * 100}%` : 0 }}
                  />
                </div>
                <div
                  className="w-4 relative rounded-t-sm transition-all"
                  style={{ height: Math.max(expExpenseHeight, data.expectedExpenses > 0 ? 2 : 0) }}
                  title={`Spend - Expected: $${data.expectedExpenses.toLocaleString()}, Actual: $${data.actualExpenses.toLocaleString()}`}
                >
                  <div className="absolute inset-0 bg-red-500/40 rounded-t-sm" />
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-red-600 rounded-t-sm transition-all"
                    style={{ height: expExpenseHeight > 0 ? `${(data.actualExpenses / data.expectedExpenses) * 100}%` : 0 }}
                  />
                </div>
                <div
                  className="absolute w-2 h-2 bg-amber-500 rounded-full border border-white shadow-sm transition-all z-20"
                  style={{
                    top: ((maxCumulative - data.cumulativeExpected) / (maxCumulative * 2)) * chartHeight,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                  title={`Cumulative: $${data.cumulativeExpected.toLocaleString()}`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
