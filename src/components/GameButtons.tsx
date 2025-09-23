import React from "react";
import { motion } from "framer-motion";
import { FaFootballBall } from "react-icons/fa";

export default function GameButtons() {
  const games = [
    { name: "NFL Squares", link: "/nflsquares", active: true }
  ];

  return (
    <motion.div
    className="flex flex-wrap justify-center gap-10 md:gap-14"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, ease: "easeOut" }}
    >
    {games.map((game, i) => {
        const Button = (
        <motion.button
            key={i}
            whileHover={{ scale: game.active ? 1.05 : 1 }}
            whileTap={{ scale: game.active ? 0.95 : 1 }}
            disabled={!game.active}
            className="game-button m-3"
        >
            <FaFootballBall className="text-4xl mb-3" />
            {game.name}
        </motion.button>
        );

        return game.active ? (
        <a href={game.link} key={i}>
            {Button}
        </a>
        ) : (
        Button
        );
    })}
    </motion.div>
  );
}
