/**
 * Planned notification message templates for rank and RP changes.
 * Add new strings to the arrays below when you want more message variety.
 *
 * Supported placeholders:
 * - {player}: tracked player's display name
 * - {rpChange}: positive or negative RP movement since the last refresh
 * - {rank}: player's new rank label
 */

export const RANK_NOTIFICATION_MESSAGES = {
  rankUp: [
    "{player} thinks he's the best.",
    "{player} ranked up to {rank} and is already acting different.",
  ],
  rankDown: [
    "{player} needs to be carried.",
    "{player} dropped to {rank}. Someone queue the rescue mission.",
  ],
  rpGain: [
    "{player} gained {rpChange} RP and thinks he's the best.",
    "{player} added {rpChange} RP. The ego is loading.",
  ],
  rpLoss: [
    "{player} lost {rpChange} RP. Time to carry them.",
    "{player} dropped {rpChange} RP. Bring the backpack.",
  ],
};
