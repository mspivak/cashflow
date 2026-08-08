import { useMemo, useRef, useState, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { ItemCard } from "./item-card";
import { Button } from "@/components/ui/button";
import type { BoardMaxima } from "@/lib/calculations";
import type { MonthData, MonthItem } from "@/types";

interface MonthColumnProps {
	month: MonthData;
	isCurrentMonth?: boolean;
	isFirstMonth?: boolean;
	isBoardEmpty?: boolean;
	interactive?: boolean;
	startingBalance?: number;
	prevTotal: number;
	chartScale: number;
	balanceScale: number;
	maxima: BoardMaxima;
	onItemClick: (item: MonthItem) => void;
	onAddIncome?: (monthId: string) => void;
	onAddSpend?: (monthId: string) => void;
}

const ITEM_GAP = 1;

export function MonthColumn({
	month,
	isCurrentMonth,
	isFirstMonth,
	isBoardEmpty,
	interactive = true,
	startingBalance,
	prevTotal,
	chartScale,
	balanceScale,
	maxima,
	onItemClick,
	onAddIncome,
	onAddSpend,
}: MonthColumnProps) {
	const [isHovered, setIsHovered] = useState(false);
	const { setNodeRef, isOver } = useDroppable({
		id: month.id,
	});

	const hasActual = month.actualBalance !== 0;

	const isNegativeBalance = month.cumulativeExpected < 0;

	const monthDelta = hasActual ? month.actualBalance : month.expectedBalance;
	const showExpectedHint =
		hasActual && month.actualBalance !== month.expectedBalance;

	const formatDelta = (n: number) =>
		`${n >= 0 ? "+" : "−"}$${Math.abs(n).toLocaleString()}`;

	const bgClass = isCurrentMonth
		? "bg-primary/5"
		: isOver
		? "bg-primary/10"
		: "bg-muted/30";

	const centerBgClass = isNegativeBalance ? "bg-band-negative" : "bg-band";

	const { incomeItems, expenseItems } = useMemo(() => {
		const income: MonthItem[] = [];
		const expense: MonthItem[] = [];
		for (const item of month.items) {
			const category =
				item.type === "entry" ? item.entry!.plan.category : item.plan!.category;
			if (category.type === "income") {
				income.push(item);
			} else {
				expense.push(item);
			}
		}
		return { incomeItems: income, expenseItems: expense };
	}, [month.items]);

	const containerRef = useRef<HTMLDivElement>(null);
	const [containerHeight, setContainerHeight] = useState(0);
	const [containerWidth, setContainerWidth] = useState(0);
	const CENTER_HEIGHT = 44;
	const GAP = 8;
	const STACK_RESERVE = 28;

	useEffect(() => {
		if (containerRef.current) {
			const observer = new ResizeObserver((entries) => {
				setContainerHeight(entries[0].contentRect.height);
				setContainerWidth(entries[0].contentRect.width);
			});
			observer.observe(containerRef.current);
			return () => observer.disconnect();
		}
	}, []);

	const sectionHeight = Math.max(0, (containerHeight - CENTER_HEIGHT) / 2);

	const { effectiveChartScale, effectiveBalanceScale } = useMemo(() => {
		if (containerHeight === 0) {
			return {
				effectiveChartScale: chartScale,
				effectiveBalanceScale: balanceScale,
			};
		}
		const maxStack = Math.max(maxima.income, maxima.expense);
		const fitChart =
			maxStack > 0
				? Math.max(0, sectionHeight - STACK_RESERVE) / (maxStack / 1000)
				: chartScale;
		const fitBalance =
			maxima.balance > 0
				? Math.max(0, sectionHeight - GAP) / (maxima.balance / 1000)
				: balanceScale;
		return {
			effectiveChartScale: Math.min(chartScale, fitChart),
			effectiveBalanceScale: Math.min(balanceScale, fitBalance),
		};
	}, [containerHeight, sectionHeight, chartScale, balanceScale, maxima]);

	const getItemHeight = (item: MonthItem) => {
		const amount =
			item.type === "entry" ? item.entry!.amount : item.plan!.expected_amount;
		return (amount / 1000) * effectiveChartScale;
	};

	const startingBalancePosition = useMemo(() => {
		if (!startingBalance || startingBalance <= 0) return 0;
		return (startingBalance / 1000) * effectiveBalanceScale;
	}, [startingBalance, effectiveBalanceScale]);

	const totalPosition = useMemo(() => {
		return (Math.abs(month.cumulativeExpected) / 1000) * effectiveBalanceScale;
	}, [month.cumulativeExpected, effectiveBalanceScale]);

	const prevTotalPosition = useMemo(() => {
		return (Math.abs(prevTotal) / 1000) * effectiveBalanceScale;
	}, [prevTotal, effectiveBalanceScale]);

	const getYPosition = (total: number, position: number) => {
		const sectionHeight = (containerHeight - CENTER_HEIGHT) / 2;
		if (total >= 0) {
			return sectionHeight - position;
		} else {
			return sectionHeight + CENTER_HEIGHT + position;
		}
	};

	const prevY = getYPosition(prevTotal, prevTotalPosition);
	const currentY = getYPosition(month.cumulativeExpected, totalPosition);

	return (
		<div
			ref={(node) => {
				setNodeRef(node);
				(
					containerRef as React.MutableRefObject<HTMLDivElement | null>
				).current = node;
			}}
			className={`min-w-32 flex-1 flex flex-col h-full transition-colors ${bgClass} relative`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{containerHeight > 0 &&
				containerWidth > 0 &&
				(() => {
					const sectionHeight = (containerHeight - CENTER_HEIGHT) / 2;
					const incomeBaseY = sectionHeight;
					const expenseBaseY = sectionHeight + CENTER_HEIGHT;
					const x1 = -(GAP / 2);
					const x2 = containerWidth + GAP / 2;

					const startX = isFirstMonth ? -10 : x1;

					const lerp = (y1: number, y2: number, targetY: number) => {
						if (y2 === y1) return startX;
						const t = (targetY - y1) / (y2 - y1);
						return startX + t * (x2 - startX);
					};

					return (
						<svg
							className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
							style={{ overflow: "visible" }}
						>
							{prevTotal >= 0 && month.cumulativeExpected >= 0 && (
								<polygon
									points={`${startX},${prevY} ${x2},${currentY} ${x2},${incomeBaseY} ${startX},${incomeBaseY}`}
									fill="var(--wedge)"
								/>
							)}
							{prevTotal < 0 && month.cumulativeExpected < 0 && (
								<polygon
									points={`${startX},${prevY} ${x2},${currentY} ${x2},${expenseBaseY} ${startX},${expenseBaseY}`}
									fill="var(--wedge-negative)"
								/>
							)}
							{prevTotal >= 0 &&
								month.cumulativeExpected < 0 &&
								(() => {
									const crossXIncome = lerp(prevY, currentY, incomeBaseY);
									const crossXExpense = lerp(prevY, currentY, expenseBaseY);
									return (
										<>
											<polygon
												points={`${startX},${prevY} ${crossXIncome},${incomeBaseY} ${startX},${incomeBaseY}`}
												fill="var(--wedge)"
											/>
											<polygon
												points={`${crossXExpense},${expenseBaseY} ${x2},${currentY} ${x2},${expenseBaseY}`}
												fill="var(--wedge-negative)"
											/>
										</>
									);
								})()}
							{prevTotal < 0 &&
								month.cumulativeExpected >= 0 &&
								(() => {
									const crossXExpense = lerp(prevY, currentY, expenseBaseY);
									const crossXIncome = lerp(prevY, currentY, incomeBaseY);
									return (
										<>
											<polygon
												points={`${startX},${prevY} ${crossXExpense},${expenseBaseY} ${startX},${expenseBaseY}`}
												fill="var(--wedge-negative)"
											/>
											<polygon
												points={`${crossXIncome},${incomeBaseY} ${x2},${currentY} ${x2},${incomeBaseY}`}
												fill="var(--wedge)"
											/>
										</>
									);
								})()}
						</svg>
					);
				})()}
			<div className="flex-1 min-h-0 basis-0 flex flex-col-reverse overflow-visible relative z-10">
				{isFirstMonth &&
					startingBalance !== undefined &&
					startingBalance > 0 && (
						<div
							className="absolute w-3.5 h-3.5 bg-primary rounded-sm border-2 border-background shadow z-50 pointer-events-none"
							style={{
								bottom: startingBalancePosition,
								left: -10,
								transform: "translate(-50%, 50%)",
							}}
							title={`Starting Balance: $${startingBalance.toLocaleString()}`}
						/>
					)}
				{month.cumulativeExpected > 0 && (
					<div
						className="absolute w-3 h-3 bg-muted-foreground rounded-full border-2 border-background shadow z-40 pointer-events-none"
						style={{
							bottom: totalPosition,
							right: -(GAP / 2 + 6),
							transform: "translateY(50%)",
						}}
						title={`Total: $${month.cumulativeExpected.toLocaleString()}`}
					/>
				)}
				{incomeItems.map((item, index) => (
					<div
						key={
							item.type === "entry"
								? item.entry!.id
								: `expected-${item.plan!.id}-${index}`
						}
						style={{ marginBottom: ITEM_GAP }}
					>
						<ItemCard
							item={item}
							onClick={onItemClick}
							itemIndex={index}
							height={getItemHeight(item)}
							interactive={interactive}
						/>
					</div>
				))}
				{onAddIncome && (
					<button
						onClick={() => onAddIncome(month.id)}
						className={`flex items-center justify-center gap-1 py-1 text-[10px] transition-colors rounded mx-0.5 mb-0.5 focus-visible:outline-2 focus-visible:outline-ring ${
							isHovered ? "text-income hover:bg-income/10" : "text-income/50"
						}`}
					>
						<Plus className="h-3 w-3" />
						Income
					</button>
				)}
				{isBoardEmpty && isCurrentMonth && onAddIncome && (
					<div className="mb-4 flex flex-col items-center gap-2 px-2 text-center">
						<p className="text-xs text-muted-foreground leading-snug">
							Plan your income and spending, then record what actually lands.
						</p>
						<Button size="sm" onClick={() => onAddIncome(month.id)}>
							Add your first income
						</Button>
					</div>
				)}
			</div>

			<div
				className={`px-1 border-y border-border/50 ${centerBgClass} shrink-0 flex flex-col items-center justify-center relative z-10`}
				style={{ height: CENTER_HEIGHT, marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4 }}
			>
				<span className="font-medium uppercase tracking-wider text-[10px] text-white/70">
					{month.name}
				</span>
				<div className="flex items-baseline gap-1.5 whitespace-nowrap overflow-hidden max-w-full">
					<span
						className="text-[13px] font-semibold tabular-nums text-white"
						title={`Projected balance at end of ${month.name}`}
					>
						{isNegativeBalance ? "−" : ""}${Math.abs(month.cumulativeExpected).toLocaleString()}
					</span>
					<span
						className={`text-[10px] tabular-nums px-1 rounded-sm bg-white/10 ${
							monthDelta >= 0 ? "text-emerald-300" : "text-red-300"
						}`}
						title={
							showExpectedHint
								? `Recorded ${formatDelta(month.actualBalance)} · planned ${formatDelta(month.expectedBalance)}`
								: hasActual
									? "Recorded change this month"
									: "Planned change this month"
						}
					>
						{formatDelta(monthDelta)}
					</span>
				</div>
			</div>

			<div className="flex-1 min-h-0 basis-0 flex flex-col overflow-visible relative z-10">
				{month.cumulativeExpected < 0 && (
					<div
						className="absolute w-3 h-3 bg-negative rounded-full border-2 border-background shadow z-40 pointer-events-none"
						style={{
							top: totalPosition,
							right: -(GAP / 2 + 6),
							transform: "translateY(-50%)",
						}}
						title={`Total: -$${Math.abs(
							month.cumulativeExpected
						).toLocaleString()}`}
					/>
				)}
				{expenseItems.map((item, index) => (
					<div
						key={
							item.type === "entry"
								? item.entry!.id
								: `expected-${item.plan!.id}-${index}`
						}
						style={{ marginTop: ITEM_GAP }}
					>
						<ItemCard
							item={item}
							onClick={onItemClick}
							itemIndex={incomeItems.length + index}
							height={getItemHeight(item)}
							interactive={interactive}
						/>
					</div>
				))}
				{onAddSpend && (
					<button
						onClick={() => onAddSpend(month.id)}
						className={`flex items-center justify-center gap-1 py-1 text-[10px] transition-colors rounded mx-0.5 mt-0.5 focus-visible:outline-2 focus-visible:outline-ring ${
							isHovered ? "text-spend hover:bg-spend/10" : "text-spend/50"
						}`}
					>
						<Plus className="h-3 w-3" />
						Spend
					</button>
				)}
			</div>
		</div>
	);
}
