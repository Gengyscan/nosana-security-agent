import { Shield, History } from "lucide-react";
import type { Finding } from "../store";

interface SidebarProps {
  findings: Finding[];
}

export const Sidebar = ({ findings }: SidebarProps) => {
  return (
    <aside className="flex w-full flex-col border-r border-slate-800 bg-slate-950/90 p-4 md:w-80">
      <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <div className="mb-2 flex items-center gap-2 text-emerald-300">
          <Shield size={18} />
          <h1 className="text-lg font-semibold">Sentinel</h1>
        </div>
        <p className="text-xs text-slate-300">Security Recon Agent</p>
        <span className="mt-3 inline-block rounded bg-black/40 px-2 py-1 text-xs text-emerald-200">
          Powered by Nosana
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-300">
        <History size={16} />
        <h2 className="font-medium">Scan History</h2>
      </div>

      <div className="mt-3 space-y-2 overflow-y-auto">
        {findings.length === 0 ? (
          <p className="text-xs text-slate-500">No findings captured yet.</p>
        ) : (
          findings.map((finding, index) => (
            <div key={`${finding.title}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
              <p className="text-xs font-semibold text-emerald-300">{finding.severity}</p>
              <p className="mt-1 text-xs text-slate-200">{finding.title}</p>
              {finding.filePath ? <p className="mt-1 text-[11px] text-slate-400">{finding.filePath}</p> : null}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
