export function BoardLegend() {
  return (
    <div className="flex items-center justify-end gap-4 pt-1.5 pb-0.5 pr-1 text-[10px] text-muted-foreground select-none">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] border border-income/60 bg-income/12" />
        Recorded
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] border border-dashed border-income/50 bg-income/5" />
        Planned
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="w-3 h-2.5"
          style={{
            background: "var(--wedge)",
            clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
          }}
        />
        Projected balance
      </span>
    </div>
  )
}
