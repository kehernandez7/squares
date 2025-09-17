import React, { useState } from "react";
import "./grid.css";

const GRID_SIZE = 10;

/**
 * Simple key for a cell: "row-col"
 */
function keyFor(row: number, col: number) {
  return `${row}-${col}`;
}

export default function Grid() {
  // Example filled (locked) cells. Replace with props or backend later.
  const [filled] = useState<Record<string, string>>({
    "2-3": "X",
    "5-7": "O",
    "0-0": "A",
  });

  // Selected cells (client-side)
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (key: string) => {
    if (filled[key]) return; // ignore clicks on filled cells
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleKey = (e: React.KeyboardEvent, key: string) => {
    if (filled[key]) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSelect(key);
    }
  };

  // Build inline template strings so grid is responsive.
  const gridCols = `auto repeat(${GRID_SIZE}, minmax(48px, 1fr))`;
  const gridRows = `auto repeat(${GRID_SIZE}, minmax(48px, 1fr))`;

  return (
    <div
      className="custom-grid"
      style={{ gridTemplateColumns: gridCols, gridTemplateRows: gridRows }}
    >
      {/* top-left corner */}
      <div className="grid-corner" />

      {/* column labels */}
      {Array.from({ length: GRID_SIZE }).map((_, col) => (
        <div key={`col-${col}`} className="grid-label column-label">
          Col {col + 1}
        </div>
      ))}

      {/* rows: label + cells */}
      {Array.from({ length: GRID_SIZE }).map((_, row) => (
        <React.Fragment key={`row-${row}`}>
          <div className="grid-label row-label">Row {row + 1}</div>

          {Array.from({ length: GRID_SIZE }).map((_, col) => {
            const k = keyFor(row, col);
            const isFilled = Boolean(filled[k]);
            const isSelected = selected.has(k);

            return (
              <div
                key={`cell-${row}-${col}`}
                role={isFilled ? undefined : "button"}
                tabIndex={isFilled ? -1 : 0}
                aria-pressed={isSelected}
                aria-disabled={isFilled}
                className={[
                  "grid-cell",
                  isFilled ? "filled" : "clickable",
                  isSelected ? "selected" : "",
                ].join(" ")}
                onClick={() => toggleSelect(k)}
                onKeyDown={(e) => handleKey(e, k)}
              >
                {isFilled ? <span className="cell-text">{filled[k]}</span> : isSelected ? <span className="cell-text">✓</span> : null}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
