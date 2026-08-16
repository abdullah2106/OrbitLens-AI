/**
 * SubsystemTable -- one row per unique subsystem_status value with a count and
 * a color-coded pill.
 *
 * Props:
 *   rows {object[]} -- full telemetry rows from GET /telemetry.
 *
 * Pill colors:
 *   nominal  -> green  (bg-green-100 text-green-800)
 *   warning  -> amber  (bg-amber-100 text-amber-800)
 *   critical -> red    (bg-red-100 text-red-800)
 *   other    -> gray   (bg-gray-100 text-gray-700)
 */
export default function SubsystemTable({ rows }) {
  const counts = {};
  for (const row of rows) {
    const status = row.subsystem_status ?? 'unknown';
    counts[status] = (counts[status] ?? 0) + 1;
  }

  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));

  function pillClass(status) {
    switch (status.toLowerCase()) {
      case 'nominal':   return 'bg-green-100 text-green-800';
      case 'warning':   return 'bg-amber-100 text-amber-800';
      case 'critical':  return 'bg-red-100   text-red-800';
      default:          return 'bg-gray-100  text-gray-700';
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#1f2328] mb-2">Subsystem Status</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[#e5e7eb]">
            <th className="text-left py-2 pr-4 font-medium text-[#57606a]">Status</th>
            <th className="text-right py-2 font-medium text-[#57606a]">Readings</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([status, count]) => (
            <tr key={status} className="border-b border-[#e5e7eb] last:border-0">
              <td className="py-2 pr-4">
                <span className={`${pillClass(status)} text-xs font-medium px-2 py-0.5 rounded-full`}>
                  {status}
                </span>
              </td>
              <td className="py-2 text-right text-[#1f2328] tabular-nums">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
