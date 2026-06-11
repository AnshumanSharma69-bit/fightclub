// ─── ELO Rating System ────────────────────────────────────────────────────────
// Same system used in chess. Starting rating: 1000
// K-factor of 32 means each fight can swing rating by max 32 points

const K_FACTOR = 32;

// expectedScore: probability that playerA beats playerB
// Returns a number between 0 and 1
// e.g. if playerA has 1200 ELO and playerB has 1000:
//   expectedScore(1200, 1000) → ~0.76 (76% chance of winning)
function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// calculateNewRatings: returns new ELO for both fighters after a fight
// winnerRating: current ELO of the winner
// loserRating: current ELO of the loser
// Returns: { winnerNewRating, loserNewRating }
function calculateNewRatings(winnerRating, loserRating) {
  const expectedWin  = expectedScore(winnerRating, loserRating);
  const expectedLoss = expectedScore(loserRating, winnerRating);

  // Winner gets points, loser loses points
  // actualScore: 1 for win, 0 for loss
  const winnerNewRating = Math.round(winnerRating + K_FACTOR * (1 - expectedWin));
  const loserNewRating  = Math.round(loserRating  + K_FACTOR * (0 - expectedLoss));

  // Floor at 0 — can't have negative ELO
  return {
    winnerNewRating: Math.max(0, winnerNewRating),
    loserNewRating:  Math.max(0, loserNewRating),
  };
}

module.exports = { calculateNewRatings };
