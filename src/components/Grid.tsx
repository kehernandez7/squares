import React, { useState, useEffect } from "react";
import "./grid.css";

const GRID_SIZE = 10;

function keyFor(row: number, col: number) {
  return `${row}-${col}`;
}

interface Selection {
  row: number;
  col: number;
  users: { name: string };
}

interface Game {
  game_uuid: string;
  name: string;
  rows?: number;
  cols?: number;
}

export default function Grid({ gameId }: { gameId: string }) {
  const [game, setGame] = useState<Game | null>(null);
  const [filled, setFilled] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Fetch game + selections from API
  useEffect(() => {
    if (!gameId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nflsquares/${gameId}`);
        const json = await res.json();

        if (json.error) {
          console.error("API Error:", json.error);
          setGame(null);
        } else {
          setGame(json.game);

          const filledMap: Record<string, string> = {};
          json.selections.forEach((s: Selection) => {
            filledMap[`${s.row}-${s.col}`] = s.users.name;
          });
          setFilled(filledMap);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setGame(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [gameId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // send selected squares + user info to API
    try {
      const res = await fetch(`/api/nflsquares/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          selected: Array.from(selected),
        }),
      });
      const data = await res.json();

      if (data.error) {
        alert("Error saving selections: " + data.error);
      } else {
        if (res.status == 207) {
          alert("Some of your selections were not saved. Please retry.");
        }
        // Optionally, update local filled map so selections are now locked
        const newFilled = { ...filled };
        selected.forEach((k) => {
          newFilled[k] = data.name; // just mark as filled
        });
        setFilled(newFilled);
        setSelected(new Set());
        setShowModal(false);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting selections");
      window.location.reload();
    }
  };

  if (loading) return <div>Loading grid...</div>;
  if (!game) return <div>Game not found.</div>;

  const rows = game.rows || GRID_SIZE;
  const cols = game.cols || GRID_SIZE;

  return (
    <div>
      <h2>{game.name}</h2>

      {/* GRID */}
      <div
        className="custom-grid"
        style={{
          gridTemplateColumns: `auto repeat(${cols}, minmax(48px, 1fr))`,
          gridTemplateRows: `auto repeat(${rows}, minmax(48px, 1fr))`,
        }}
      >
        {/* top-left corner */}
        <div className="grid-corner" />

        {/* column labels */}
        {Array.from({ length: cols }).map((_, col) => (
          <div key={`col-${col}`} className="grid-label column-label">
            Col {col + 1}
          </div>
        ))}

        {/* rows */}
        {Array.from({ length: rows }).flatMap((_, row) => {
          const rowElements = [];
          // row label
          rowElements.push(
            <div key={`row-label-${row}`} className="grid-label row-label">
              Row {row + 1}
            </div>
          );

          // cells
          for (let col = 0; col < cols; col++) {
            const k = keyFor(row, col);
            const isFilled = Boolean(filled[k]);
            const isSelected = selected.has(k);

            rowElements.push(
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
          }

          return rowElements;
        })}
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
