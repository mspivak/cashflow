import { useMemo, useRef, useState, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ItemCard } from "./item-card";
import type { MonthData, MonthItem } from "@/types";

interface MonthColumnProps {
	month: MonthData;
	isCurrentMonth?: boolean;
	isFirstMonth?: boolean;
	startingBalance?: number;
	prevTotal: number;
	maxAmount: number;
	chartScale: number;
	balanceScale: number;
	onItemClick: (item: MonthItem) => void;
}

const ITEM_GAP = 1;

export function MonthColumn({
	month,
	isCurrentMonth,
	isFirstMonth,
	startingBalance,
	prevTotal,
	maxAmount,
	chartScale,
	balanceScale,
	onItemClick,
}: MonthColumnProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: month.id,
	});

	const hasActual = month.actualBalance !== 0;

	const isNegativeBalance = month.cumulativeExpected < 0;

	const bgClass = isCurrentMonth
		? "bg-blue-50 dark:bg-blue-950/30"
		: isOver
		? "bg-blue-100 dark:bg-blue-900/30"
		: "bg-muted/30";

	const centerBgClass = isNegativeBalance
		? "bg-red-100 dark:bg-red-900/30"
		: "bg-muted/30";

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

	const getItemHeight = (item: MonthItem) => {
		const amount =
			item.type === "entry" ? item.entry!.amount : item.plan!.expected_amount;
		return (amount / 1000) * chartScale;
	};

	const totalIncomeHeight = useMemo(() => {
		return incomeItems.reduce((sum, item) => {
			return sum + getItemHeight(item) + ITEM_GAP;
		}, 0);
	}, [incomeItems, chartScale]);

	const startingBalancePosition = useMemo(() => {
		if (!startingBalance || startingBalance <= 0) return 0;
		return (startingBalance / 1000) * balanceScale;
	}, [startingBalance, balanceScale]);

	const totalPosition = useMemo(() => {
		return (Math.abs(month.cumulativeExpected) / 1000) * balanceScale;
	}, [month.cumulativeExpected, balanceScale]);

	const prevTotalPosition = useMemo(() => {
		return (Math.abs(prevTotal) / 1000) * balanceScale;
	}, [prevTotal, balanceScale]);

	const containerRef = useRef<HTMLDivElement>(null);
	const [containerHeight, setContainerHeight] = useState(0);
	const [containerWidth, setContainerWidth] = useState(0);
	const CENTER_HEIGHT = 96;
	const GAP = 8;

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
							className="absolute inset-0 w-full h-full pointer-events-none z-0"
							style={{ overflow: "visible" }}
						>
							{prevTotal >= 0 && month.cumulativeExpected >= 0 && (
								<polygon
									points={`${startX},${prevY} ${x2},${currentY} ${x2},${incomeBaseY} ${startX},${incomeBaseY}`}
									fill="rgba(156, 163, 175, 0.3)"
								/>
							)}
							{prevTotal < 0 && month.cumulativeExpected < 0 && (
								<polygon
									points={`${startX},${prevY} ${x2},${currentY} ${x2},${expenseBaseY} ${startX},${expenseBaseY}`}
									fill="rgba(239, 68, 68, 0.3)"
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
												fill="rgba(156, 163, 175, 0.3)"
											/>
											<polygon
												points={`${crossXExpense},${expenseBaseY} ${x2},${currentY} ${x2},${expenseBaseY}`}
												fill="rgba(239, 68, 68, 0.3)"
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
												fill="rgba(239, 68, 68, 0.3)"
											/>
											<polygon
												points={`${crossXIncome},${incomeBaseY} ${x2},${currentY} ${x2},${incomeBaseY}`}
												fill="rgba(156, 163, 175, 0.3)"
											/>
										</>
									);
								})()}
						</svg>
					);
				})()}
			<div className="flex-1 flex flex-col-reverse overflow-visible relative z-10">
				{isFirstMonth &&
					startingBalance !== undefined &&
					startingBalance > 0 && (
						<div
							className="absolute w-3.5 h-3.5 bg-blue-500 rounded-sm border-2 border-white shadow z-50 pointer-events-none"
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
						className="absolute w-3 h-3 bg-gray-500 rounded-full border-2 border-white shadow z-40 pointer-events-none"
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
						/>
					</div>
				))}
			</div>

			<div
				className={`px-1 py-1.5 border-y border-border/50 ${centerBgClass} space-y-0.5 shrink-0 h-24 flex flex-col justify-center relative z-10`}
			>
				<div
					className={`text-[10px] font-semibold text-center uppercase tracking-wide mb-1 ${
						isNegativeBalance ? "text-red-600" : "text-muted-foreground"
					}`}
				>
					{month.name}
				</div>
				<div className="flex justify-between text-[10px]">
					<span className="text-muted-foreground">Balance</span>
					<div className="flex gap-1.5 font-mono">
						{hasActual && month.expectedBalance === month.actualBalance ? (
							<span
								className={`font-medium ${
									month.actualBalance >= 0 ? "text-green-600" : "text-red-600"
								}`}
							>
								{month.actualBalance >= 0 ? "+" : ""}
								{month.actualBalance.toLocaleString()}
							</span>
						) : (
							<>
								<span
									className={`font-medium ${
										month.expectedBalance >= 0
											? "text-green-600/50"
											: "text-red-600/50"
									}`}
								>
									{month.expectedBalance >= 0 ? "+" : ""}
									{month.expectedBalance.toLocaleString()}
								</span>
								{hasActual && (
									<span
										className={`font-medium ${
											month.actualBalance >= 0
												? "text-green-600"
												: "text-red-600"
										}`}
									>
										{month.actualBalance >= 0 ? "+" : ""}
										{month.actualBalance.toLocaleString()}
									</span>
								)}
							</>
						)}
					</div>
				</div>
				<div className="flex justify-between text-[11px] font-semibold border-t border-border/30 pt-0.5">
					<span className="text-muted-foreground">Total</span>
					<span
						className={`font-mono ${
							month.cumulativeExpected >= 0 ? "text-green-600" : "text-red-600"
						}`}
					>
						${month.cumulativeExpected.toLocaleString()}
					</span>
				</div>
			</div>

			<div className="flex-1 flex flex-col overflow-visible relative z-10">
				{month.cumulativeExpected < 0 && (
					<div
						className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow z-40 pointer-events-none"
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
						/>
					</div>
				))}
			</div>
		</div>
	);
}
