export type ContextChip = {
  id: string;
  label: string;
  onClear?: () => void;
};

type ReviewContextBarProps = {
  screen: string;
  item?: string | null;
  progress?: string | null;
  chips: ContextChip[];
  emptyFilterLabel: string;
  selectionLabel: string;
  onBack?: (() => void) | undefined;
  backLabel?: string | undefined;
};

export function ReviewContextBar({
  screen,
  item,
  progress,
  chips,
  emptyFilterLabel,
  selectionLabel,
  onBack,
  backLabel,
}: ReviewContextBarProps) {
  return (
    <div className="review-context-bar" role="status">
      <div className="review-context-top">
        {onBack ? (
          <button type="button" className="back-to-list" onClick={onBack}>
            {backLabel ?? '←'}
          </button>
        ) : null}
        <div className="review-context-meta">
          <span className="review-context-screen">{screen}</span>
          {progress ? <span className="review-context-progress">{progress}</span> : null}
        </div>
      </div>
      {item ? (
        <p className="review-context-item">
          <span className="review-context-item-label">{selectionLabel}</span> {item}
        </p>
      ) : null}
      <div className="review-context-filters" aria-label={selectionLabel}>
        {chips.length === 0 ? (
          <span className="filter-chip filter-chip-empty">{emptyFilterLabel}</span>
        ) : (
          chips.map(chip =>
            chip.onClear ? (
              <button
                key={chip.id}
                type="button"
                className="filter-chip removable"
                onClick={chip.onClear}
              >
                {chip.label}
                <span aria-hidden="true"> ×</span>
              </button>
            ) : (
              <span key={chip.id} className="filter-chip">
                {chip.label}
              </span>
            ),
          )
        )}
      </div>
    </div>
  );
}
