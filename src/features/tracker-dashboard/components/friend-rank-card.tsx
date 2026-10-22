/**
 * Shows one tracked friend's account details, current rank, and RP progress.
 */

import { CalendarDays, Trash2 } from "lucide-react";
import { memo } from "react";
import { createRankLabel } from "@/domain/apex-ranked/rank-calculations/rank-progress-calculator";
import { PlayerRankStatus } from "@/domain/apex-ranked/types/apex-tracker-types";
import { RankBadge } from "@/features/tracker-dashboard/components/rank-badge";
import { PLATFORM_DISPLAY_NAME } from "@/features/tracker-dashboard/config/dashboard-defaults";
import {
  createPlayerInitials,
  formatNumber,
} from "@/features/tracker-dashboard/utilities/dashboard-display-formatters";

function formatSignedRp(value: number) {
  if (value === 0) return "0 RP";
  return `${value > 0 ? "+" : ""}${formatNumber(value)} RP`;
}

function FriendRankCardComponent({
  player,
  onRemove,
  onViewDailyRp,
}: {
  player: PlayerRankStatus;
  onRemove: (player: PlayerRankStatus) => void;
  onViewDailyRp: (player: PlayerRankStatus) => void;
}) {
  // Change the row markup here if you want friend cards to show more stats later.
  const label = createRankLabel(player.rankName, player.rankDivision);

  return (
    <article className="friend-card">
      <div className="friend-top">
        <div className="avatar small-avatar">{createPlayerInitials(player.name)}</div>
        <div className="friend-name">
          <strong>{player.name}</strong>
          <span>{PLATFORM_DISPLAY_NAME[player.platform]} | Lvl {player.level}</span>
        </div>
        <button className="icon-button quiet-button" onClick={() => onRemove(player)} aria-label={`Remove ${player.name}`}>
          <Trash2 size={15} />
        </button>
      </div>
      <div className="friend-rank">
        <RankBadge player={player} />
        <div>
          <span className="eyebrow">Current rank</span>
          <strong>{label}</strong>
          <small>{formatNumber(player.rankScore)} RP</small>
        </div>
      </div>
      <div className="mini-progress">
        <span style={{ width: `${player.progress.percent}%` }} />
      </div>
      <div className="friend-progress-copy">
        <span>
          {player.progress.remaining === null
            ? "Top rank"
            : `${formatNumber(player.progress.remaining)} RP to go`}
        </span>
        <span className={player.rpHistory && player.rpHistory.dailyNetRp !== 0
          ? (player.rpHistory.dailyNetRp > 0 ? "gain" : "loss")
          : undefined}
        >
          Today {player.rpHistory ? formatSignedRp(player.rpHistory.dailyNetRp) : "0 RP"}
        </span>
      </div>
      <div className="friend-card-actions">
        <button className="friend-stats-button" onClick={() => onViewDailyRp(player)} type="button">
          <CalendarDays size={13} />
          Daily RP
        </button>
        <button className="friend-remove-button" onClick={() => onRemove(player)} type="button">
          <Trash2 size={13} />
          Remove
        </button>
      </div>
    </article>
  );
}

export const FriendRankCard = memo(FriendRankCardComponent);
