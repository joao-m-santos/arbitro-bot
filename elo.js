export const BASE_ELO = 1200;

// Change `k` based on # of games player has
export function calculateElo(ratingA, ratingB, result, k = 32) {
  const expectedScore = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const ratingDelta = k * (result - expectedScore);
  return Math.ceil(ratingDelta);
}
