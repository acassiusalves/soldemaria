
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, X, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface ChatBubbleProps {
  salesData: any[]; // Não mais usado, mas mantido para compatibilidade
  pathname: string;
}

type Message = {
  role: "user" | "model";
  content: string;
};

const GREETING_MESSAGE: Message = {
    role: "model",
    content: "Olá, eu sou a Maria, a inteligência artificial da Sol de Maria.\n\nPosso te ajudar a encontrar informações sobre as vendas, clientes, produtos e por ai vai...",
};

const LAST_GREETING_KEY = "lastMariaGreetingDate";

export default function ChatBubble({ salesData, pathname }: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showGreetingBubble, setShowGreetingBubble] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const today = new Date().toDateString();
    const lastGreetingDate = localStorage.getItem(LAST_GREETING_KEY);

    if (lastGreetingDate !== today) {
        // Show greeting bubble for 5 seconds
        const timer = setTimeout(() => {
            setShowGreetingBubble(true);
            localStorage.setItem(LAST_GREETING_KEY, today);
        }, 2000); // Delay showing it slightly

        const hideTimer = setTimeout(() => {
            setShowGreetingBubble(false);
        }, 7000); // Show for 5s then hide

        return () => {
            clearTimeout(timer);
            clearTimeout(hideTimer);
        }
    }
  }, []);

  const handleToggle = () => {
    setShowGreetingBubble(false);
    setIsOpen(!isOpen);
  }

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([GREETING_MESSAGE]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        // A bit of a hack to scroll to the bottom.
        // The underlying radix-ui scroll area doesn't expose a ref to the viewport.
        const scrollableView = scrollAreaRef.current.querySelector('div[style*="overflow: scroll"]');
        if (scrollableView) {
            scrollableView.scrollTop = scrollableView.scrollHeight;
        }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Chamar a API que consulta o Firebase diretamente
      // A chave API do Gemini agora é compartilhada no servidor
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: input,
          pathname,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar pergunta');
      }

      const result = await response.json();
      const modelMessage: Message = { role: "model", content: result.answer };
      setMessages((prev) => [...prev, modelMessage]);

    } catch (error: any) {
      console.error("Error calling chat API:", error);

      let errorMsg = "Desculpe, ocorreu um erro ao processar sua pergunta. 😔";

      // Tratamento específico de erros
      if (error?.message?.includes("API key")) {
        errorMsg = "❌ A chave de API parece estar inválida. Por favor, verifique se você configurou corretamente na página de Conexões.";
      } else if (error?.message?.includes("quota") || error?.message?.includes("limit")) {
        errorMsg = "⚠️ Limite de requisições atingido. Por favor, tente novamente em alguns instantes.";
      } else if (error?.message?.includes("network") || error?.message?.includes("fetch")) {
        errorMsg = "🌐 Erro de conexão. Verifique sua internet e tente novamente.";
      }

      const errorMessage: Message = { role: "model", content: errorMsg };
      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: "Erro ao processar pergunta",
        description: error.message || "Verifique os logs do console para mais detalhes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-24 right-5 z-50"
          >
            <Card className="w-[350px] h-[500px] shadow-2xl flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <CardTitle className="font-headline">Assistente Maria</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={handleToggle} className="h-7 w-7">
                    <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 ${
                          message.role === "user" ? "justify-end" : ""
                        }`}
                      >
                        {message.role === "model" && (
                          <Avatar className="h-8 w-8 border-2 border-primary/50">
                             <AvatarFallback className="bg-primary/20">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`rounded-lg px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {message.content}
                        </div>
                         {message.role === "user" && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="https://picsum.photos/100/100" data-ai-hint="person" alt="User" />
                            <AvatarFallback>UV</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-2">
                             <Avatar className="h-8 w-8 border-2 border-primary/50">
                                <AvatarFallback className="bg-primary/20">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="rounded-lg px-3 py-2 text-sm bg-muted flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Analisando...</span>
                            </div>
                        </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t">
                  <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Pergunte sobre suas vendas..."
                      disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-5 right-5 z-50">
          <AnimatePresence>
            {showGreetingBubble && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-full right-0 mb-3"
              >
                <div className="bg-background shadow-lg rounded-lg p-3 text-sm relative">
                  Oi 👋
                  <div className="absolute -bottom-1 right-4 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-background"></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        >
          <Button onClick={handleToggle} size="icon" className="rounded-full w-14 h-14 shadow-lg">
            {isOpen ? <X className="h-6 w-6"/> : <Sparkles className="h-6 w-6" />}
          </Button>
        </motion.div>
      </div>
    </>
  );
}
