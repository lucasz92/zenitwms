"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

const SUGGESTIONS = [
    "¿Qué productos tienen bajo stock?",
    "¿Dónde está guardado el producto 10-01?",
    "Resumen de los movimientos de hoy",
];

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const handleSubmit = async (e?: React.FormEvent, providedText?: string) => {
        e?.preventDefault();
        const text = providedText || input;
        if (!text.trim() || isLoading) return;

        // Add user message
        const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            // Llama a la API (Mock)
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...messages, userMsg] }),
            });

            if (!response.ok) throw new Error("Error en el servidor");

            const data = await response.json();

            // Add assistant response
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), role: "assistant", content: data.content },
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { id: "error", role: "assistant", content: "Lo siento, hubo un error de conexión. Intenta de nuevo más tarde." },
            ]);
        } finally {
            setIsLoading(false);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto border-x border-border/40 shadow-sm bg-card/30">
            {/* Header */}
            <header className="flex h-14 items-center justify-between border-b px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold">Zenit AI</h2>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            En línea
                        </p>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-6 text-center max-w-md mx-auto">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 shadow-inner">
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">¿En qué puedo ayudarte hoy?</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Soy el asistente de Zenit WMS. Puedo ayudarte a consultar stock, verificar ubicaciones o revisar movimientos.
                            </p>
                        </div>

                        <div className="grid gap-2 w-full mt-4">
                            {SUGGESTIONS.map((sug, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSubmit(undefined, sug)}
                                    className="text-left px-4 py-3 text-sm bg-background border rounded-lg hover:border-primary/50 hover:bg-accent hover:shadow-sm transition-all text-muted-foreground hover:text-foreground"
                                >
                                    "{sug}"
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex w-full gap-3 md:gap-4",
                                    message.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                {message.role === "assistant" && (
                                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background shadow-sm mt-0.5">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "relative px-4 py-3 text-sm shadow-sm md:max-w-[80%]",
                                        message.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                                            : "bg-muted/50 border rounded-2xl rounded-tl-sm text-foreground whitespace-pre-wrap"
                                    )}
                                >
                                    {message.content}
                                </div>
                                {message.role === "user" && (
                                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm mt-0.5">
                                        <User className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex w-full gap-3 md:gap-4 justify-start">
                                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background shadow-sm mt-0.5">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="bg-muted/50 border rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5 h-[44px]">
                                    <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}
                    </>
                )}
                {/* Dummy div to scroll to bottom */}
                <div ref={messagesEndRef} className="h-px" />
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 bg-background border-t">
                <form
                    onSubmit={handleSubmit}
                    className="relative flex w-full items-end gap-2 bg-muted/30 border border-input rounded-xl focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all p-1 shadow-sm overflow-hidden"
                >
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Preguntale a Zenit AI..."
                        className="flex-1 max-h-[120px] min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-sm focus:outline-none placeholder:text-muted-foreground"
                        rows={1}
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading}
                        className={cn(
                            "mb-1 mr-1 shrink-0 h-9 w-9 rounded-lg transition-all",
                            input.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Enviar mensaje</span>
                    </Button>
                </form>
                <div className="text-center mt-2 px-4">
                    <p className="text-[10px] text-muted-foreground/70">
                        La IA puede cometer errores. Verifica la información importante directamente en las tablas correspondientes.
                    </p>
                </div>
            </div>
        </div>
    );
}
