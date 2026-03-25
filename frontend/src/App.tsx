import { ChatInterface } from "./components/ChatInterface";
import { MessageInput } from "./components/MessageInput";
import { Sidebar } from "./components/Sidebar";
import { useChatStore } from "./store";

const App = () => {
  const messages = useChatStore((state) => state.messages);
  const findings = useChatStore((state) => state.findings);
  const isLoading = useChatStore((state) => state.isLoading);
  const sendMessage = useChatStore((state) => state.sendMessage);

  return (
    <main className="min-h-screen bg-app text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <Sidebar findings={findings} />
        <section className="flex flex-1 flex-col">
          <header className="border-b border-slate-800 bg-slate-950/40 p-4">
            <h2 className="text-lg font-semibold text-emerald-300">Security Recon Console</h2>
            <p className="text-xs text-slate-400">Use severity-based findings for rapid triage.</p>
          </header>
          <ChatInterface messages={messages} isLoading={isLoading} />
          <MessageInput onSend={sendMessage} disabled={isLoading} />
        </section>
      </div>
    </main>
  );
};

export default App;
