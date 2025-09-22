import React, { useState, useEffect } from "react";
import "./gamesetup.css";

export default function GameSetup() {
  const [weeks, setWeeks] = useState<{ number: number; text: string }[]>([]);
  const [week, setWeek] = useState("current");
  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [name, setName] = useState("");
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
    <div className="game-setup-container">
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
            placeholder="Game Name (optional)"
          />
        </label>

        <button
          type="submit"
          disabled={loading || !selectedGameId}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Game"}
        </button>
      </form>
    </div>
  );
}
