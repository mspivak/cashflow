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
  const maxBarValue = Math.max(maxIncome, maxExpense)

  const maxAbsCumulative = Math.max(
    ...chartData.map((d) => Math.abs(d.cumulativeExpected)),
    1
  )

  const chartHeight = 120
  const zeroY = chartHeight / 2

  const getCumulativeY = (value: number) => {
    return zeroY - (value / maxAbsCumulative) * (zeroY - 8)
  }

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
          <div className="w-2 h-2 rounded-sm bg-gray-400/40" />
          <span className="text-muted-foreground">Balance</span>
        </div>
      </div>

      <div className="relative" style={{ height: chartHeight }}>
        <div
          className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/30"
          style={{ top: zeroY }}
        />
        <span
          className="absolute text-[9px] text-muted-foreground/50"
          style={{ top: zeroY - 5, left: 2 }}
        >
          0
        </span>

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 100 ${chartHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id="positiveClip">
              <rect x="0" y="0" width="100" height={zeroY} />
            </clipPath>
            <clipPath id="negativeClip">
              <rect x="0" y={zeroY} width="100" height={chartHeight - zeroY} />
            </clipPath>
          </defs>
          <polygon
            fill="rgba(156, 163, 175, 0.4)"
            clipPath="url(#positiveClip)"
            points={`${0.5 / chartData.length * 100},${zeroY} ${chartData
              .map((data, i) => {
                const x = ((i + 0.5) / chartData.length) * 100
                const y = getCumulativeY(data.cumulativeExpected)
                return `${x},${y}`
              })
              .join(" ")} ${((chartData.length - 0.5) / chartData.length) * 100},${zeroY}`}
          />
          <polygon
            fill="rgba(239, 68, 68, 0.3)"
            clipPath="url(#negativeClip)"
            points={`${0.5 / chartData.length * 100},${zeroY} ${chartData
              .map((data, i) => {
                const x = ((i + 0.5) / chartData.length) * 100
                const y = getCumulativeY(data.cumulativeExpected)
                return `${x},${y}`
              })
              .join(" ")} ${((chartData.length - 0.5) / chartData.length) * 100},${zeroY}`}
          />
          <polyline
            fill="none"
            stroke="rgba(107, 114, 128, 0.8)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            points={chartData
              .map((data, i) => {
                const x = ((i + 0.5) / chartData.length) * 100
                const y = getCumulativeY(data.cumulativeExpected)
                return `${x},${y}`
              })
              .join(" ")}
          />
        </svg>

        <div className="flex gap-2 h-full">
          {chartData.map((data, i) => {
            const barAreaHeight = zeroY - 8
            const expIncomeHeight = (data.expectedIncome / maxBarValue) * barAreaHeight
            const expExpenseHeight = (data.expectedExpenses / maxBarValue) * barAreaHeight

            return (
              <div
                key={i}
                className="flex-1 min-w-32 relative bg-muted/20 rounded-sm"
              >
                <div
                  className="absolute w-6 rounded-t-sm transition-all"
                  style={{
                    bottom: chartHeight - zeroY,
                    left: "50%",
                    transform: "translateX(-50%)",
                    height: Math.max(expIncomeHeight, data.expectedIncome > 0 ? 2 : 0),
                  }}
                  title={`Income - Expected: $${data.expectedIncome.toLocaleString()}, Actual: $${data.actualIncome.toLocaleString()}`}
                >
                  <div className="absolute inset-0 bg-green-500/40 rounded-t-sm" />
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-green-600 rounded-t-sm transition-all"
                    style={{ height: expIncomeHeight > 0 ? `${(data.actualIncome / data.expectedIncome) * 100}%` : 0 }}
                  />
                </div>
                <div
                  className="absolute w-6 rounded-b-sm transition-all"
                  style={{
                    top: zeroY,
                    left: "50%",
                    transform: "translateX(-50%)",
                    height: Math.max(expExpenseHeight, data.expectedExpenses > 0 ? 2 : 0),
                  }}
                  title={`Spend - Expected: $${data.expectedExpenses.toLocaleString()}, Actual: $${data.actualExpenses.toLocaleString()}`}
                >
                  <div className="absolute inset-0 bg-red-500/40 rounded-b-sm" />
                  <div
                    className="absolute top-0 left-0 right-0 bg-red-600 rounded-b-sm transition-all"
                    style={{ height: expExpenseHeight > 0 ? `${(data.actualExpenses / data.expectedExpenses) * 100}%` : 0 }}
                  />
                </div>
                <div
                  className="absolute w-2 h-2 bg-gray-500 rounded-full border border-white shadow-sm transition-all z-20"
                  style={{
                    top: getCumulativeY(data.cumulativeExpected) - 4,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                  title={`Balance: $${data.cumulativeExpected.toLocaleString()}`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
