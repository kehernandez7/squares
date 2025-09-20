import React, { useState } from "react";
import "./grid.css";

const GRID_SIZE = 10;

function keyFor(row: number, col: number) {
  return `${row}-${col}`;
}

export default function Grid() {
  const [filled] = useState<Record<string, string>>({
    "2-3": "X",
    "5-7": "O",
    "0-0": "A",
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);

  const toggleSelect = (key: string) => {
    if (filled[key]) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
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

  // simple form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitted:", { name, email, selected: Array.from(selected) });
    alert(
      `Name: ${name}\nEmail: ${email}\nSelected cells: ${Array.from(
        selected
      ).join(", ")}`
    );
    setShowModal(false); // close modal after submit
  };

  return (
    <div>
      {/* GRID */}
      <div
        className="custom-grid"
        style={{
          gridTemplateColumns: `auto repeat(${GRID_SIZE}, minmax(48px, 1fr))`,
          gridTemplateRows: `auto repeat(${GRID_SIZE}, minmax(48px, 1fr))`,
        }}
      >
        {/* top-left corner */}
        <div className="grid-corner" />

        {/* column labels */}
        {Array.from({ length: GRID_SIZE }).map((_, col) => (
          <div key={`col-${col}`} className="grid-label column-label">
            Col {col + 1}
          </div>
        ))}

        {/* rows */}
        {Array.from({ length: GRID_SIZE }).map((_, row) => (
          <React.Fragment key={`row-${row}`}>
            <div className="grid-label row-label">Row {row + 1}</div>
            {Array.from({ length: GRID_SIZE }).map((_, col) => {
              const k = keyFor(row, col);
              const isFilled = Boolean(filled[k]);
              const isSelected = selected.has(k);

              return (
                <div
                  key={k}
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
                  {isFilled ? (
                    <span className="cell-text">{filled[k]}</span>
                  ) : isSelected ? (
                    <span className="cell-text">✓</span>
                  ) : null}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Submit Button */}
      <div className="form-actions">
        <button type="button" onClick={() => setShowModal(true)}>
          Submit
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Enter Your Info</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Name:
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label>
                Email:
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
