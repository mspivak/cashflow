import { useMemo } from "react"
import type { MonthData } from "@/types"

interface CashflowChartProps {
  months: MonthData[]
}

export function CashflowChart({ months }: CashflowChartProps) {
  const chartData = useMemo(() => {
    return months.map((month) => {
      const income = month.items
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0)
      const expenses = month.items
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0)
      const optional = month.items
        .filter((item) => item.type === "optional")
        .reduce((sum, item) => sum + item.amount, 0)

      return {
        income,
        expenses,
        optional,
        cumulative: month.cumulativeBalance,
      }
    })
  }, [months])

  // Calculate max values for scaling
  const maxIncome = Math.max(...chartData.map((d) => d.income), 1)
  const maxExpense = Math.max(...chartData.map((d) => d.expenses + d.optional), 1)
  const maxCumulative = Math.max(...chartData.map((d) => Math.abs(d.cumulative)), 1)

  const chartHeight = 120

  return (
    <div className="mb-4">
      {/* Legend */}
      <div className="flex gap-4 mb-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-green-500" />
          <span className="text-muted-foreground">Income</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-red-500" />
          <span className="text-muted-foreground">Expenses</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-purple-500" />
          <span className="text-muted-foreground">Optional</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Cumulative</span>
        </div>
      </div>

      {/* Chart bars - aligned with columns */}
      <div className="flex gap-2" style={{ height: chartHeight }}>
        {chartData.map((data, i) => {
          const incomeHeight = (data.income / maxIncome) * (chartHeight * 0.4)
          const expenseHeight = (data.expenses / maxExpense) * (chartHeight * 0.4)
          const optionalHeight = (data.optional / maxExpense) * (chartHeight * 0.4)
          const cumulativeY = ((maxCumulative - data.cumulative) / (maxCumulative * 2)) * chartHeight

          return (
            <div
              key={i}
              className="flex-1 min-w-32 relative flex items-end justify-center gap-0.5 bg-muted/20 rounded-sm"
            >
              {/* Income bar */}
              <div
                className="w-2 bg-green-500 rounded-t-sm transition-all"
                style={{ height: Math.max(incomeHeight, 2) }}
                title={`Income: $${data.income.toLocaleString()}`}
              />
              {/* Stacked expense bars */}
              <div className="flex flex-col-reverse">
                <div
                  className="w-2 bg-red-500 rounded-t-sm transition-all"
                  style={{ height: Math.max(expenseHeight, data.expenses > 0 ? 2 : 0) }}
                  title={`Expenses: $${data.expenses.toLocaleString()}`}
                />
                <div
                  className="w-2 bg-purple-500 transition-all"
                  style={{ height: Math.max(optionalHeight, data.optional > 0 ? 2 : 0) }}
                  title={`Optional: $${data.optional.toLocaleString()}`}
                />
              </div>
              {/* Cumulative dot */}
              <div
                className="absolute w-2 h-2 bg-amber-500 rounded-full border border-white shadow-sm transition-all"
                style={{ top: cumulativeY, left: "50%", transform: "translateX(-50%)" }}
                title={`Cumulative: $${data.cumulative.toLocaleString()}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
