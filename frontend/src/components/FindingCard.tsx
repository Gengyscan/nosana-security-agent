import type { Finding, Severity } from "../store";

interface FindingCardProps {
  finding: Finding;
}

const severityStyles: Record<Severity, string> = {
  CRITICAL: "bg-red-500/20 text-red-300 border border-red-400/40",
  HIGH: "bg-orange-500/20 text-orange-200 border border-orange-400/40",
  MEDIUM: "bg-yellow-500/20 text-yellow-200 border border-yellow-400/40",
  LOW: "bg-blue-500/20 text-blue-200 border border-blue-400/40",
  INFO: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40",
};

export const FindingCard = ({ finding }: FindingCardProps) => {
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded px-2 py-1 text-xs font-semibold ${severityStyles[finding.severity]}`}>
          {finding.severity}
        </span>
        <h4 className="text-sm font-semibold text-slate-100">{finding.title}</h4>
      </div>
      {finding.filePath ? <p className="text-xs text-emerald-300">File: {finding.filePath}</p> : null}
      <p className="mt-2 text-xs text-slate-300">{finding.description}</p>
    </article>
  );
};
