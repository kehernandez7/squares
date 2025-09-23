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
  nfl_game: string;
  team_1: string;
  team_2: string;
  password_required?: boolean;
}

export default function Grid({ gameId }: { gameId: string }) {
  const [game, setGame] = useState<Game | null>(null);
  const [filled, setFilled] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [numbers, setNumbers] = useState<{ row: number[]; col: number[] } | null>(null);
  const [winners, setWinners] = useState<{ row: number; col: number; quarters: number[] }[]>([]);

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // 🔒 Check if password required
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const res = await fetch(`/api/nflsquares/${gameId}/meta`);
        const json = await res.json();

        if (json.error) {
          console.error("Meta API Error:", json.error);
          setGame(null);
          setLoading(false);
          return;
        }

        if (json.password_required) {
          setShowPasswordModal(true);
          setLoading(false);
        } else {
          fetchData();
        }
      } catch (err) {
        console.error("Error checking password requirement:", err);
        setLoading(false);
      }
    };

    checkPassword();
  }, [gameId]);

  // Fetch grid data (only after password is verified OR no password required)
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
        setWinners(json.winners || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setGame(null);
    }
    setLoading(false);
    fetchNumbers();
  };

  const fetchNumbers = async () => {
    try {
      const res = await fetch(`/api/nflsquares/${gameId}/numbers`);
      const json = await res.json();
      if (json.rows) {
        setNumbers(json.rows);
      }
    } catch (err) {
      console.error("Error fetching numbers:", err);
    }
  };

  // 🔑 Handle password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/nflsquares/${gameId}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setShowPasswordModal(false);
        setAuthError("");
        fetchData(); // load grid data now
      } else {
        setAuthError("Invalid password. Please try again.");
      }
    } catch (err) {
      console.error("Password verification error:", err);
      setAuthError("Server error. Try again.");
    }
  };

  // Modal open → lock background
  useEffect(() => {
    if (showModal || showPasswordModal) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }, [showModal, showPasswordModal]);

  // 🔒 Password modal blocks everything
  if (showPasswordModal) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h2>Enter Game Password</h2>
          <form onSubmit={handlePasswordSubmit} className="modal-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
            {authError && <p className="error-text">{authError}</p>}
            <div className="modal-actions">
              <button type="submit">Unlock</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 🔄 Loading spinner
  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }


  if (!game) {
    return (
      <div className="not-found">
        <h2 className="error-title">Game not found</h2>
        <p className="error-text">It looks like this game doesn’t exist or may have been deleted.</p>
        <a href="/nflsquares" className="create-link">
          Create a New Game
        </a>
      </div>
    );
  }

  const rows = game.rows || GRID_SIZE;
  const cols = game.cols || GRID_SIZE;
  const allFilled = Object.keys(filled).length >= rows * cols;

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
        if (res.status === 207) {
          alert("Some of your selections were not saved. Please retry.");
        }
        const newFilled = { ...filled };
        selected.forEach((k) => {
          newFilled[k] = data.name;
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

  const handleGenerateNumbers = async () => {
    try {
      const res = await fetch(`/api/nflsquares/${gameId}/numbers`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.rows) {
        setNumbers(json.rows);
        alert("Numbers generated!");
      } else if (json.message) {
        alert(json.message);
      }
    } catch (err) {
      console.error("Error generating numbers:", err);
      alert("Failed to generate numbers");
    }
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">
        {game.name && `${game.name} - `}{game.nfl_game}
      </h2>
      <div className="grid-wrapper">
        {/* GRID */}
        <div
          className="custom-grid"
          style={{
            gridTemplateColumns: `auto auto repeat(${cols}, minmax(48px, 1fr))`,
            gridTemplateRows: `auto auto repeat(${rows}, minmax(48px, 1fr))`,
          }}
        >
          <div className="grid-corner" />
          <div
            className="grid-label column-label team-label"
            style={{ gridColumn: `3 / span ${cols}`, gridRow: "1" }}
          >
            {game.team_2}
          </div>
          <div className="grid-corner" />
          <div
            className="grid-label column-label"
            style={{ gridRow: "2", gridColumn: "2" }}
          >
            #
          </div>
          {Array.from({ length: cols }).map((_, col) => (
            <div
              key={`col-${col}`}
              className="grid-label number-label"
              style={{ gridRow: "2", gridColumn: col + 3 }}
            >
              {numbers ? numbers.col[col] : ""}
            </div>
          ))}
          <div
            className="grid-label row-label team-label-left"
            style={{ gridRow: `3 / span ${rows}`, gridColumn: "1" }}
          >
            {game.team_1}
          </div>
          {Array.from({ length: rows }).map((_, row) => (
            <div
              key={`row-${row}-num`}
              className="grid-label number-label"
              style={{ gridRow: row + 3, gridColumn: "2" }}
            >
              {numbers ? numbers.row[row] : ""}
            </div>
          ))}
          {Array.from({ length: rows }).flatMap((_, row) =>
            Array.from({ length: cols }).map((_, col) => {
              const k = keyFor(row, col);
              const isFilled = Boolean(filled[k]);
              const isSelected = selected.has(k);
              const winner = winners.find((w) => w.row === row && w.col === col);

              return (
                <div
                  key={k}
                  className={[
                    "grid-cell",
                    isFilled ? "filled" : "clickable",
                    isSelected ? "selected" : "",
                    winner ? "winner" : "",
                  ].join(" ")}
                  style={{ gridRow: row + 3, gridColumn: col + 3 }}
                  onClick={() => toggleSelect(k)}
                  onKeyDown={(e) => handleKey(e, k)}
                >
                  {winner ? (
                    <span className="cell-text">
                      {filled[k] || ""}
                      <br />
                      🏆Q{winner.quarters.join(",")}
                    </span>
                  ) : isFilled ? (
                    <span className="cell-text">{filled[k]}</span>
                  ) : isSelected ? (
                    <span className="cell-text">✓</span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      {!allFilled && (
        <div className="form-actions">
          <button
            type="button"
            disabled={allFilled || selected.size === 0}
            onClick={() => setShowModal(true)}
          >
            Submit
          </button>
        </div>
      )}

      {!numbers && (
        <div className="form-actions">
          <button type="button" onClick={handleGenerateNumbers} disabled={!allFilled}>
            Generate Numbers
          </button>
        </div>
      )}

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
