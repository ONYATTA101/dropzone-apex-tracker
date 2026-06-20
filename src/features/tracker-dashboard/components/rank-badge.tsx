/**
 * Displays a player's Apex rank badge using the live API image when available,
 * with a styled shield fallback for demo data or missing images.
 */

import { Shield } from "lucide-react";
import { memo } from "react";
import { PlayerRankStatus } from "@/domain/apex-ranked/types/apex-tracker-types";
import { RANK_DISPLAY_COLOR } from "@/features/tracker-dashboard/config/dashboard-defaults";

function RankBadgeComponent({
  player,
  large = false,
}: {
  player: PlayerRankStatus;
  large?: boolean;
}) {
  // Rank colors come from dashboard-defaults.ts, so theme changes do not require touching this component.
  const color = RANK_DISPLAY_COLOR[player.rankName] ?? "#8ea0b5";

  return (
    <div
      className={`rank-badge ${large ? "rank-badge-large" : ""}`}
      style={{ "--rank-color": color } as React.CSSProperties}
    >
      <div className="rank-badge-inner">
        {player.rankImage ? (
          // The image URL is supplied by the Apex stats API rather than the Next.js asset pipeline.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.rankImage} alt="" />
        ) : (
          <Shield strokeWidth={1.5} />
        )}
      </div>
    </div>
  );
}

export const RankBadge = memo(RankBadgeComponent);
