import React, { useState, useEffect } from "react";
import "./gamesetup.css";

export default function GameSetup() {
  const [weeks, setWeeks] = useState<{ number: number; text: string }[]>([]);
  const [week, setWeek] = useState("current");
  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);


  // Load weeks dynamically
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await fetch("/api/nflsquares/weeks");
        const json = await res.json();
        if (Array.isArray(json)) setWeeks(json);
      } catch (err) {
        console.error("Error fetching weeks:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Load games when week changes
    useEffect(() => {
    const fetchGames = async () => {
        setLoadingGames(true);
        try {
        const params = week === "current" ? "" : `?season=2025&type=2&week=${week}`;
        const res = await fetch(`/api/nflsquares/upcoming${params}`);
        const json = await res.json();
        if (Array.isArray(json)) setGames(json);
        } catch (err) {
        console.error("Error fetching games:", err);
        } finally {
        setLoadingGames(false);
        }
    };
    fetchGames();
    }, [week]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const game = games.find((g) => g.id === selectedGameId);

    try {
      const res = await fetch("/api/nflsquares/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nfl_game_id: game.id,
          row_team_id: game.rowTeamId,
          column_team_id: game.colTeamId,
          name,
          password
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        window.location.href = `/nflsquares/${data.game.game_uuid}`;
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error creating game");
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <><div className="page-container fade-in-up">
    <div className="info-box fade-in-up">
      <h3>How NFL Squares Works</h3>
      <p><strong>What Are NFL Squares?</strong><br />
        NFL Squares is a fun game often played during football games. A 10x10 grid is created, giving 100 possible squares. Each square represents one possible score combination for the two teams.</p>

      <p><strong>How to Play</strong><br />
        1. Players pick squares on the grid.<br />
        2. Once the grid is completely filled, the numbers <strong>0–9</strong> are randomly assigned across the top (for one team) and down the side (for the other team).<br />
        3. Each square then corresponds to the last digit of each team’s score at the end of each quarter.</p>

      <p><strong>How to Win</strong><br />
        At the end of each quarter, look at the last digit of both teams’ scores. Find where those digits intersect on the grid. Whoever claimed that square wins the prize for that quarter.</p>

      <p><em>Note: Numbers aren’t assigned until the grid is full—so every square has an equal chance at being a winner.</em></p>
    </div><div className="game-setup-container">
        <h1 className="title fade-in-up">Create a New NFL Squares Game</h1>
        <form onSubmit={handleSubmit} className="game-setup-form fade-stagger">
          {/* Week Selector */}
          <label className="text-left">
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="w-full border p-2 rounded"
              disabled={loadingGames}
            >
              <option value="current">This Week</option>
              {weeks.map((w) => (
                <option key={w.number} value={w.number.toString()}>
                  {w.text}
                </option>
              ))}
            </select>
          </label>

          {/* Game Selector */}
          <label className="text-left">
            {loadingGames ? (
              <div className="flex items-center gap-2 p-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span>Loading games...</span>
              </div>
            ) : (
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                required
                className="w-full border p-2 rounded"
              >
                <option value="">-- choose game --</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.shortDetail})
                  </option>
                ))}
              </select>
            )}
          </label>

          {/* Optional Name */}
          <label className="text-left">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Game Name (optional)" />
          </label>

          {/* Optional Name */}
          <label className="text-left">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (optional)" />
          </label>

          <button
            type="submit"
            disabled={loading || !selectedGameId}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Game"}
          </button>
        </form>
      </div></div></>
  );
}
