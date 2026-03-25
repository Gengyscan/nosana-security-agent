import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../store";
import { FindingCard } from "./FindingCard";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export const ChatInterface = ({ messages, isLoading }: ChatInterfaceProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages, isLoading]);

  return (
    <div ref={containerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-emerald-700/30 bg-slate-900/50 p-6 text-sm text-slate-300">
          Ask Sentinel to scan a repository URL or analyze a code snippet.
        </div>
      ) : null}

      {messages.map((message) => {
        const isUser = message.kind === "user";
        return (
          <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-3xl rounded-2xl p-4 text-sm leading-relaxed ${
                isUser ? "bg-emerald-500/20 text-emerald-100" : "bg-slate-900 text-slate-100"
              }`}
            >
              <ReactMarkdown>{message.text}</ReactMarkdown>
              {message.kind === "assistant" && message.findings.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {message.findings.map((finding, index) => (
                    <FindingCard key={`${message.id}-${index}`} finding={finding} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {isLoading ? <p className="text-xs text-slate-400">Sentinel is analyzing...</p> : null}
    </div>
  );
};
