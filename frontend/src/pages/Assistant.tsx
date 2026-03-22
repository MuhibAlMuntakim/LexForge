import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Bot, User, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getHistory, queryContractChat } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ContractItem = { id: string; name: string };
type Message = { role: "assistant" | "user"; content: string };

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Hello! I'm your AI Legal Assistant. Ask me across all contracts, or optionally scope to one contract.",
  },
];

const Assistant = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [companyId, setCompanyId] = useState("default_co");
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [selectedContract, setSelectedContract] = useState("all");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingContracts, setLoadingContracts] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("company_id") || "default_co";
    setCompanyId(saved);
  }, []);

  useEffect(() => {
    const loadContracts = async () => {
      try {
        setLoadingContracts(true);
        const history = await getHistory();
        setContracts(
          history.map((item) => ({
            id: item.contract_id,
            name: `Contract ${item.contract_id.slice(0, 8)} (${item.company_id})`,
          }))
        );
      } finally {
        setLoadingContracts(false);
      }
    };

    loadContracts();
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const filteredContracts = useMemo(() => {
    const normalized = (companyId || "").trim().toLowerCase();
    if (!normalized) return contracts;
    return contracts.filter((c) => c.name.toLowerCase().includes(`(${normalized})`));
  }, [contracts, companyId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setSending(true);

    try {
      const result = await queryContractChat({
        question: userMsg.content,
        company_id: companyId,
        contract_id: selectedContract !== "all" ? selectedContract : undefined,
        top_k: 6,
        chat_history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
      });

      const citationSummary =
        result.citations.length > 0
          ? `\n\nSources:\n${result.citations
              .slice(0, 3)
              .map((c, i) => `${i + 1}. ${c.filename || "document"} (${c.chunk_id})`)
              .join("\n")}`
          : "";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `${String(result.answer || "")}${citationSummary}` },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Chat request failed";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `I could not process that request: ${message}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto w-full max-w-5xl flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contracts")}>
            <ArrowLeft size={16} />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Central chat over your contract corpus.</p>
          </div>
          <Input
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="Company ID"
            className="w-44"
          />
          <Select value={selectedContract} onValueChange={setSelectedContract}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="All contracts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All contracts</SelectItem>
              {filteredContracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section className="min-h-0 flex-1">
        <div ref={scrollRef} className="h-full overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-4xl space-y-4">
            {loadingContracts && (
              <p className="text-xs text-muted-foreground">Loading contracts...</p>
            )}
            {!loadingContracts && filteredContracts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No contracts found for this company yet. Upload one from the Contracts page.
              </p>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                    <Bot size={16} className="text-primary" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-3xl px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-line",
                    msg.role === "assistant"
                      ? "bg-card border border-border text-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {msg.content}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
                    <User size={16} className="text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card/95 backdrop-blur px-6 py-4">
        <div className="mx-auto w-full max-w-4xl flex gap-2">
          <div className="hidden sm:flex items-center px-3 text-xs text-muted-foreground border border-border rounded-md bg-background">
            <FileText size={12} className="mr-1" />
            {selectedContract === "all" ? "All Contracts" : selectedContract.slice(0, 8)}
          </div>
          <Input
            placeholder="Ask legal questions grounded in your contract corpus..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!input.trim() || sending} size="icon">
            <Send size={16} />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default Assistant;
