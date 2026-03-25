import { useState } from "react";

interface MessageInputProps {
  onSend: (text: string) => Promise<void>;
  disabled: boolean;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [value, setValue] = useState("");

  const submit = async () => {
    const next = value.trim();
    if (!next || disabled) {
      return;
    }
    setValue("");
    await onSend(next);
  };

  return (
    <div className="border-t border-slate-800 bg-slate-950/80 p-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Paste code or a GitHub URL and ask Sentinel to scan"
          className="w-full bg-transparent px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
        <button
          onClick={() => void submit()}
          disabled={disabled}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Send
        </button>
      </div>
    </div>
  );
};
