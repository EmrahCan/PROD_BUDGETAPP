import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, Lightbulb, X, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIReportAssistantProps {
  startDate: Date;
  endDate: Date;
}

export function AIReportAssistant({ startDate, endDate }: AIReportAssistantProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<string>("");

  // Get speech language based on current i18n language
  const getSpeechLang = () => {
    switch (i18n.language) {
      case 'tr': return 'tr-TR';
      case 'de': return 'de-DE';
      case 'en': return 'en-US';
      default: return 'tr-TR';
    }
  };

  const {
    transcript,
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition(getSpeechLang());

  const {
    isSpeaking,
    isSupported: isTTSSupported,
    speak,
    stop: stopSpeaking,
  } = useSpeechSynthesis(getSpeechLang());

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-submit when speech recognition stops and we have a transcript
  useEffect(() => {
    if (!isListening && transcript && transcript.trim()) {
      handleSubmit(transcript);
    }
  }, [isListening, transcript]);

  // Auto-speak new assistant messages when enabled
  useEffect(() => {
    if (!autoSpeak || !isTTSSupported) return;
    
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === 'assistant' && 
      lastMessage.content && 
      !isLoading &&
      lastMessage.content !== lastAssistantMessageRef.current
    ) {
      lastAssistantMessageRef.current = lastMessage.content;
      speak(lastMessage.content);
    }
  }, [messages, isLoading, autoSpeak, isTTSSupported, speak]);

  // Suggested questions based on report context
  const suggestedQuestions = [
    t('reports.ai.suggestion1'),
    t('reports.ai.suggestion2'),
    t('reports.ai.suggestion3'),
    t('reports.ai.suggestion4'),
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (question: string) => {
    if (!question.trim() || isLoading || !user) return;

    // Stop any ongoing speech when new question is asked
    if (isSpeaking) {
      stopSpeaking();
    }

    const userMessage: Message = { role: "user", content: question };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error(t('common.sessionExpired'));
        setIsLoading(false);
        return;
      }

      // Format dates for API
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            language: i18n.language,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(t('ai.rateLimitError'));
          setIsLoading(false);
          return;
        }
        if (response.status === 402) {
          toast.error(t('ai.creditsError'));
          setIsLoading(false);
          return;
        }
        throw new Error('AI request failed');
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  assistantContent += content;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                    return updated;
                  });
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('AI Report Assistant error:', error);
      toast.error(t('ai.fetchError'));
      // Remove the empty assistant message if there was an error
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || prev[i].content));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    handleSubmit(question);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeakMessage = (content: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(content);
    }
  };

  const toggleAutoSpeak = () => {
    if (autoSpeak && isSpeaking) {
      stopSpeaking();
    }
    setAutoSpeak(!autoSpeak);
  };

  if (!isExpanded) {
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20"
        onClick={() => setIsExpanded(true)}
      >
        <CardContent className="p-6 lg:p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 lg:p-4 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
              <Sparkles className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-base lg:text-lg">{t('reports.ai.title')}</h3>
              <p className="text-sm lg:text-base text-muted-foreground">{t('reports.ai.description')}</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">{t('reports.ai.clickToExpand')}</p>
            </div>
            <Badge variant="secondary" className="bg-violet-500/20 text-violet-700 dark:text-violet-300 text-sm px-3 py-1">
              AI
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
      <CardHeader className="p-4 lg:p-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-2 lg:p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm lg:text-lg">{t('reports.ai.title')}</CardTitle>
              <p className="text-xs text-muted-foreground hidden sm:block">{t('reports.ai.description')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Auto-speak toggle */}
            {isTTSSupported && (
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 ${autoSpeak ? 'text-violet-500' : 'text-muted-foreground'}`}
                onClick={toggleAutoSpeak}
                title={autoSpeak ? t('reports.ai.autoSpeakOff') : t('reports.ai.autoSpeakOn')}
              >
                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 lg:p-6 pt-0 space-y-4">
        {/* Listening/Speaking indicator */}
        {(isListening || isSpeaking) && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border animate-pulse ${
            isListening 
              ? 'bg-violet-500/10 border-violet-500/20' 
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <div className="relative">
              {isListening ? (
                <>
                  <Mic className="h-4 w-4 text-violet-500" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-ping" />
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 text-emerald-500" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                </>
              )}
            </div>
            <span className={`text-sm ${isListening ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isListening ? t('reports.ai.listening') : t('reports.ai.speaking')}
            </span>
            {isSpeaking && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 px-2 text-xs"
                onClick={stopSpeaking}
              >
                {t('reports.ai.stopSpeaking')}
              </Button>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 ? (
          <ScrollArea className="h-64 lg:h-80 pr-3" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`group max-w-[90%] lg:max-w-[80%] rounded-xl px-4 py-3 text-sm lg:text-base relative ${
                      msg.role === 'user'
                        ? 'bg-violet-500 text-white'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.content || (isLoading && i === messages.length - 1 && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ))}
                    {/* Speak button for assistant messages */}
                    {msg.role === 'assistant' && msg.content && isTTSSupported && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-1 -bottom-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm border"
                        onClick={() => handleSpeakMessage(msg.content)}
                        title={t('reports.ai.speakMessage')}
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              <span>{t('reports.ai.suggestions')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs lg:text-sm h-auto py-2.5 px-3 whitespace-normal text-left justify-start"
                  onClick={() => handleSuggestionClick(q)}
                  disabled={isLoading}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          {/* Voice Input Button */}
          {isSpeechSupported && (
            <Button
              type="button"
              variant={isListening ? "default" : "outline"}
              size="icon"
              className={`h-10 lg:h-11 w-10 lg:w-11 shrink-0 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'hover:bg-violet-500/10 hover:border-violet-500/50'
              }`}
              onClick={toggleListening}
              disabled={isLoading}
              title={isListening ? t('reports.ai.stopListening') : t('reports.ai.startListening')}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          
          <Input
            placeholder={isListening ? t('reports.ai.listeningPlaceholder') : t('reports.ai.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(input)}
            disabled={isLoading || isListening}
            className="text-sm lg:text-base h-10 lg:h-11"
          />
          <Button
            size="sm"
            className="h-10 lg:h-11 px-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            onClick={() => handleSubmit(input)}
            disabled={isLoading || !input.trim() || isListening}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
