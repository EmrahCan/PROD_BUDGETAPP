import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Brain, Send, User, Loader2, Sparkles, Trash2, Mic, MicOff, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Link } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-chat`;

// Demo chat messages
const getDemoChatMessages = (lang: string): Message[] => {
  if (lang === 'tr') {
    return [
      { role: "user", content: "Bu ay ne kadar harcadım?" },
      { role: "assistant", content: "**Bu Ayın Harcama Özeti** 📊\n\nBu ay toplam **4.850 ₺** harcama yaptınız. İşte kategori bazlı dağılım:\n\n- **Market & Gıda:** 1.250 ₺ (%26)\n- **Faturalar:** 980 ₺ (%20)\n- **Ulaşım:** 650 ₺ (%13)\n- **Eğlence:** 520 ₺ (%11)\n- **Diğer:** 1.450 ₺ (%30)\n\n💡 **Öneri:** Market harcamalarınız geçen aya göre %15 arttı. Alışveriş listesi hazırlayarak bu kategoride tasarruf edebilirsiniz." },
      { role: "user", content: "Tasarruf önerilerin neler?" },
      { role: "assistant", content: "**Kişiselleştirilmiş Tasarruf Önerileri** 💰\n\nFinansal durumunuzu analiz ettim. İşte size özel önerilerim:\n\n**1. Abonelik Optimizasyonu**\nAktif 4 dijital aboneliğiniz var. Bunları gözden geçirerek aylık 150-200 ₺ tasarruf edebilirsiniz.\n\n**2. Market Alışverişi**\n- Haftalık menü planlayın\n- İndirim günlerini takip edin\n- Toplu alışveriş yapın\n\n**3. Acil Durum Fonu**\nAylık gelirinizin %10'unu (yaklaşık 800 ₺) acil durum fonuna ayırmanızı öneririm.\n\n**4. Otomatik Tasarruf**\nMaaş gününde otomatik transfer kurarak \"önce kendine öde\" prensibini uygulayın.\n\n🎯 Bu önerileri uygularsanız aylık **1.000-1.500 ₺** tasarruf edebilirsiniz!" }
    ];
  } else if (lang === 'de') {
    return [
      { role: "user", content: "Wie viel habe ich diesen Monat ausgegeben?" },
      { role: "assistant", content: "**Ausgabenübersicht dieses Monats** 📊\n\nSie haben diesen Monat insgesamt **485 €** ausgegeben. Hier ist die Aufschlüsselung:\n\n- **Lebensmittel:** 125 € (26%)\n- **Rechnungen:** 98 € (20%)\n- **Transport:** 65 € (13%)\n- **Unterhaltung:** 52 € (11%)\n- **Sonstiges:** 145 € (30%)\n\n💡 **Tipp:** Ihre Lebensmittelausgaben sind im Vergleich zum Vormonat um 15% gestiegen. Erstellen Sie eine Einkaufsliste, um hier zu sparen." },
      { role: "user", content: "Spartipps für mich?" },
      { role: "assistant", content: "**Personalisierte Spartipps** 💰\n\nNach Analyse Ihrer Finanzsituation hier meine Empfehlungen:\n\n**1. Abonnement-Optimierung**\nSie haben 4 aktive digitale Abonnements. Durch Überprüfung können Sie 15-20 € monatlich sparen.\n\n**2. Lebensmitteleinkauf**\n- Wöchentlichen Menüplan erstellen\n- Angebote verfolgen\n- Großeinkäufe tätigen\n\n**3. Notfallfonds**\nIch empfehle, 10% Ihres monatlichen Einkommens (ca. 80 €) für einen Notfallfonds zurückzulegen.\n\n**4. Automatisches Sparen**\nRichten Sie am Zahltag einen automatischen Transfer ein.\n\n🎯 Mit diesen Tipps können Sie monatlich **100-150 €** sparen!" }
    ];
  }
  return [
    { role: "user", content: "How much did I spend this month?" },
    { role: "assistant", content: "**This Month's Spending Summary** 📊\n\nYou spent a total of **$485** this month. Here's the breakdown:\n\n- **Groceries & Food:** $125 (26%)\n- **Bills:** $98 (20%)\n- **Transportation:** $65 (13%)\n- **Entertainment:** $52 (11%)\n- **Other:** $145 (30%)\n\n💡 **Tip:** Your grocery spending increased by 15% compared to last month. Consider making a shopping list to save in this category." },
    { role: "user", content: "What are your savings tips?" },
    { role: "assistant", content: "**Personalized Savings Tips** 💰\n\nAfter analyzing your financial situation, here are my recommendations:\n\n**1. Subscription Optimization**\nYou have 4 active digital subscriptions. By reviewing them, you could save $15-20 monthly.\n\n**2. Grocery Shopping**\n- Plan weekly menus\n- Track sales and discounts\n- Buy in bulk when possible\n\n**3. Emergency Fund**\nI recommend setting aside 10% of your monthly income (about $80) for an emergency fund.\n\n**4. Automatic Savings**\nSet up automatic transfers on payday to \"pay yourself first.\"\n\n🎯 By following these tips, you could save **$100-150** monthly!" }
  ];
};

export function FinancialChat() {
  const { user, session } = useAuth();
  const { isDemoMode } = useDemo();
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoTyping, setIsDemoTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if user is authenticated (not demo mode) or in demo mode
  const isAuthenticated = !!user && !!session?.access_token && !isDemoMode;
  const canUseChat = isAuthenticated || isDemoMode;

  // Load demo messages when in demo mode
  useEffect(() => {
    if (isDemoMode && messages.length === 0) {
      setMessages(getDemoChatMessages(i18n.language));
    }
  }, [isDemoMode, i18n.language]);

  // Speech recognition setup
  const speechLang = i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : 'en-US';
  const { 
    transcript, 
    isListening, 
    isSupported: isSpeechSupported, 
    startListening, 
    stopListening 
  } = useSpeechRecognition(speechLang);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Update input when speech transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Demo mode response generator
  const getDemoResponse = (question: string): string => {
    const q = question.toLowerCase();
    if (i18n.language === 'tr') {
      if (q.includes('harca') || q.includes('gider')) {
        return "**Bu Ayın Harcama Detayları** 📊\n\nToplam harcamanız **3.420 ₺** olarak gerçekleşti.\n\n- **Market:** 890 ₺\n- **Faturalar:** 650 ₺\n- **Ulaşım:** 480 ₺\n- **Yeme-İçme:** 720 ₺\n- **Diğer:** 680 ₺\n\n💡 Yeme-içme kategorisinde geçen aya göre %20 artış var. Ev yemekleri tercih ederek bu kategoride tasarruf yapabilirsiniz.";
      } else if (q.includes('bütçe') || q.includes('yönet')) {
        return "**Bütçe Yönetimi İpuçları** 📋\n\n**50/30/20 Kuralı:**\n- Gelirin %50'si: Zorunlu giderler\n- Gelirin %30'si: İstekler\n- Gelirin %20'si: Tasarruf\n\n**Sizin için önerilerim:**\n1. Her harcamayı kaydedin\n2. Haftalık bütçe belirleyin\n3. Nakit kullanmayı deneyin\n4. Dürtüsel alışverişten kaçının\n\n🎯 Bu yöntemlerle finansal kontrolü elinize alabilirsiniz!";
      } else if (q.includes('tasarruf') || q.includes('birik')) {
        return "**Tasarruf Stratejileri** 💰\n\n**1. Otomatik Tasarruf**\nMaaş gününde otomatik transfer ayarlayın.\n\n**2. Gereksiz Abonelikleri İptal Edin**\nKullanmadığınız servisleri gözden geçirin.\n\n**3. Enerji Tasarrufu**\nFaturalarınızda %15'e kadar tasarruf mümkün.\n\n**4. İkinci El Tercih Edin**\nÖzellikle elektronik ve mobilyada.\n\n🌟 Küçük adımlar büyük birikimler yaratır!";
      }
      return "Sorunuzu anladım! Finansal durumunuzu analiz ettiğimde, genel olarak iyi bir yolda olduğunuzu görüyorum. Başka bir konuda yardımcı olabilir miyim? Harcamalar, tasarruf veya bütçe planlaması hakkında sorular sorabilirsiniz.";
    } else if (i18n.language === 'de') {
      if (q.includes('ausgeb') || q.includes('kosten')) {
        return "**Ausgabendetails dieses Monats** 📊\n\nIhre Gesamtausgaben betrugen **342 €**.\n\n- **Lebensmittel:** 89 €\n- **Rechnungen:** 65 €\n- **Transport:** 48 €\n- **Essen gehen:** 72 €\n- **Sonstiges:** 68 €\n\n💡 Die Kategorie Essen gehen ist um 20% gestiegen. Kochen Sie öfter zu Hause, um zu sparen.";
      } else if (q.includes('budget') || q.includes('verwalten')) {
        return "**Budget-Management-Tipps** 📋\n\n**Die 50/30/20 Regel:**\n- 50% für Notwendigkeiten\n- 30% für Wünsche\n- 20% für Sparen\n\n**Meine Empfehlungen:**\n1. Jede Ausgabe aufzeichnen\n2. Wöchentliches Budget festlegen\n3. Bargeld verwenden\n4. Impulskäufe vermeiden\n\n🎯 Mit diesen Methoden behalten Sie die Kontrolle!";
      }
      return "Ich verstehe Ihre Frage! Nach Analyse Ihrer Finanzsituation sind Sie auf einem guten Weg. Kann ich Ihnen bei etwas anderem helfen? Fragen Sie mich zu Ausgaben, Sparen oder Budgetplanung.";
    }
    if (q.includes('spend') || q.includes('expense')) {
      return "**This Month's Spending Details** 📊\n\nYour total spending was **$342**.\n\n- **Groceries:** $89\n- **Bills:** $65\n- **Transportation:** $48\n- **Dining out:** $72\n- **Other:** $68\n\n💡 Dining out category increased by 20%. Consider cooking more at home to save.";
    } else if (q.includes('budget') || q.includes('manage')) {
      return "**Budget Management Tips** 📋\n\n**The 50/30/20 Rule:**\n- 50% for necessities\n- 30% for wants\n- 20% for savings\n\n**My recommendations:**\n1. Track every expense\n2. Set weekly budgets\n3. Try using cash\n4. Avoid impulse purchases\n\n🎯 These methods will help you take control!";
    } else if (q.includes('save') || q.includes('saving')) {
      return "**Savings Strategies** 💰\n\n**1. Automatic Savings**\nSet up automatic transfers on payday.\n\n**2. Cancel Unused Subscriptions**\nReview services you don't use.\n\n**3. Energy Savings**\nUp to 15% savings on utility bills possible.\n\n**4. Buy Second-hand**\nEspecially for electronics and furniture.\n\n🌟 Small steps create big savings!";
    }
    return "I understand your question! Analyzing your financial situation, you're on a good track overall. Can I help with something else? Feel free to ask about spending, savings, or budget planning.";
  };

  const sendMessageWithContent = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    // Demo mode handling
    if (isDemoMode) {
      const userMessage: Message = { role: "user", content: content.trim() };
      setMessages(prev => [...prev, userMessage]);
      setInput("");
      setIsDemoTyping(true);
      
      // Simulate AI response delay
      setTimeout(() => {
        const response = getDemoResponse(content);
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
        setIsDemoTyping(false);
      }, 1500);
      return;
    }
    
    if (!isAuthenticated) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Required for functions endpoint
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          // Must be the signed-in user's session token
          "Authorization": `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          language: i18n.language,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(t('ai.rateLimitError'));
          throw new Error('Rate limited');
        }
        if (response.status === 402) {
          toast.error(t('ai.creditsError'));
          throw new Error('Credits exhausted');
        }
        throw new Error('Failed to start stream');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Add empty assistant message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (lastIdx >= 0 && newMessages[lastIdx].role === "assistant") {
                  newMessages[lastIdx] = { ...newMessages[lastIdx], content: assistantContent };
                }
                return newMessages;
              });
            }
          } catch {
            // Incomplete JSON, put it back
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (lastIdx >= 0 && newMessages[lastIdx].role === "assistant") {
                  newMessages[lastIdx] = { ...newMessages[lastIdx], content: assistantContent };
                }
                return newMessages;
              });
            }
          } catch { /* ignore */ }
        }
      }

    } catch (error) {
      console.error("Chat error:", error);
      if (!assistantContent) {
        // Remove the empty assistant message if no content was received
        setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
        toast.error(t('ai.fetchError'));
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [isAuthenticated, session, isLoading, messages, i18n.language, t]);

  // Auto-send when speech recognition ends with content
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 0) {
      const timer = setTimeout(() => {
        sendMessageWithContent(transcript.trim());
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, sendMessageWithContent]);

  const sendMessage = () => {
    sendMessageWithContent(input);
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="mb-1">
            {parts.map((part, j) => 
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </p>
        );
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return <li key={i} className="ml-4 mb-0.5">{line.replace(/^[-•]\s*/, '')}</li>;
      }
      if (line.trim()) {
        return <p key={i} className="mb-1">{line}</p>;
      }
      return <br key={i} />;
    });
  };

  const suggestedQuestions = i18n.language === 'tr' ? [
    "Bu ay ne kadar harcadım?",
    "Tasarruf önerilerin neler?",
    "Bütçemi nasıl yönetebilirim?",
  ] : i18n.language === 'de' ? [
    "Wie viel habe ich ausgegeben?",
    "Spartipps für mich?",
    "Wie kann ich mein Budget verwalten?",
  ] : [
    "How much did I spend this month?",
    "What are your savings tips?",
    "How can I manage my budget?",
  ];

  return (
    <Card className="flex flex-col h-[600px] border-2 border-primary/20">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            {t('aiAdvisor.chatTitle')}
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {!canUseChat ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <div className="p-4 rounded-full bg-amber-500/10 mb-4">
                <LogIn className="h-10 w-10 text-amber-600" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {i18n.language === 'tr' ? 'Giriş Yapmanız Gerekiyor' : i18n.language === 'de' ? 'Anmeldung erforderlich' : 'Login Required'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {i18n.language === 'tr' 
                  ? 'AI finansal danışman özelliğini kullanmak için lütfen giriş yapın.'
                  : i18n.language === 'de'
                  ? 'Bitte melden Sie sich an, um den KI-Finanzberater zu nutzen.'
                  : 'Please login to use the AI financial advisor.'}
              </p>
              <Button asChild>
                <Link to="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  {i18n.language === 'tr' ? 'Giriş Yap' : i18n.language === 'de' ? 'Anmelden' : 'Login'}
                </Link>
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Brain className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('aiAdvisor.chatWelcome')}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {t('aiAdvisor.chatDescription')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedQuestions.map((question, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setInput(question);
                      inputRef.current?.focus();
                    }}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10">
                        <Brain className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 max-w-[80%] text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {formatMessage(message.content)}
                      </div>
                    ) : (
                      message.content
                    )}
                    {message.role === "assistant" && message.content === "" && (isLoading || isDemoTyping) && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            {isSpeechSupported && canUseChat && (
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={handleMicClick}
                disabled={isLoading || isDemoTyping || !canUseChat}
                className={cn(
                  "flex-shrink-0 transition-all",
                  isListening && "animate-pulse"
                )}
                title={isListening ? t('aiAdvisor.stopListening') : t('aiAdvisor.startListening')}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={!canUseChat 
                ? (i18n.language === 'tr' ? 'Giriş yapmanız gerekiyor' : i18n.language === 'de' ? 'Anmeldung erforderlich' : 'Login required')
                : isListening ? t('aiAdvisor.listening') : t('aiAdvisor.chatPlaceholder')}
              disabled={isLoading || isDemoTyping || isListening || !canUseChat}
              className={cn(
                "flex-1 transition-all",
                isListening && "border-destructive bg-destructive/5"
              )}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isDemoTyping || isListening || !canUseChat}
              size="icon"
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {isListening && (
            <p className="text-xs text-muted-foreground mt-2 text-center animate-pulse">
              🎙️ {t('aiAdvisor.listeningMessage')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
