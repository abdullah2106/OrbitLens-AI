/**
 * HealthScore -- Mission Health Score badge.
 *
 * Props:
 *   healthScore {number} -- 0-100, from the upload response.
 *
 * Color thresholds (canonical, must match orbitlens-plan.md):
 *   >= 80  -> green   (bg-green-500)
 *   50-79  -> amber   (bg-amber-400)
 *   < 50   -> red     (bg-red-500)
 */
export default function HealthScore({ healthScore }) {
  let colorClass;
  if (healthScore >= 80) {
    colorClass = 'bg-green-500';
  } else if (healthScore >= 50) {
    colorClass = 'bg-amber-400';
  } else {
    colorClass = 'bg-red-500';
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-[#57606a]">Mission Health</span>
      <span
        className={`${colorClass} text-white text-sm font-semibold px-3 py-1 rounded-full`}
        aria-label={`Mission health score: ${healthScore} out of 100`}
      >
        Score: {healthScore}
      </span>
    </div>
  );
}
