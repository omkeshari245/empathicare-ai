import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Heart, Send, ArrowLeft, AlertTriangle, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  mood?: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi there! I'm your AI wellness companion. I'm here to listen without judgment and support you on your mental health journey. How are you feeling today? 💙",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mock crisis detection - in real app this would use NLP
  const detectCrisisKeywords = (message: string): boolean => {
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'self-harm', 'hurt myself', 'want to die'];
    return crisisKeywords.some(keyword => message.toLowerCase().includes(keyword));
  };

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `https://pifqddvdfrsqmlbvhqlr.supabase.co/functions/v1/chat`;
    
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [
            ...messages.filter(m => !m.isUser || m.content !== userMessage).map(m => ({
              role: m.isUser ? "user" : "assistant",
              content: m.content
            })),
            { role: "user", content: userMessage }
          ] 
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
        
        if (resp.status === 429) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Too many requests. Please try again in a moment.",
            variant: "destructive",
          });
        } else if (resp.status === 402) {
          toast({
            title: "Service Unavailable",
            description: "AI service requires payment. Please contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: errorData.error || "Failed to get AI response",
            variant: "destructive",
          });
        }
        
        setIsTyping(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      // Create initial assistant message
      const assistantMessageId = (Date.now() + 1).toString();
      
      while (!streamDone) {
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
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.id === assistantMessageId) {
                  return prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, content: assistantContent }
                      : m
                  );
                }
                return [...prev, {
                  id: assistantMessageId,
                  content: assistantContent,
                  isUser: false,
                  timestamp: new Date(),
                }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsTyping(false);
    } catch (e) {
      console.error("Stream error:", e);
      toast({
        title: "Connection Error",
        description: "Failed to connect to AI service",
        variant: "destructive",
      });
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue("");
    setIsTyping(true);

    // Check for crisis keywords
    if (detectCrisisKeywords(messageText)) {
      toast({
        title: "Crisis Support Available",
        description: "I've detected you might be in distress. Professional help is available 24/7.",
        variant: "destructive",
      });
    }

    await streamChat(messageText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-calm flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold">AI Wellness Companion</h1>
                <p className="text-xs text-muted-foreground">Always here to listen</p>
              </div>
            </div>
          </div>
          
          <Button variant="outline" size="sm" className="text-destructive border-destructive">
            <Phone className="w-4 h-4 mr-2" />
            Crisis Help
          </Button>
        </div>
      </header>

      {/* Crisis Alert */}
      <div className="bg-destructive/10 border-l-4 border-destructive px-4 py-3">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-destructive font-medium">
              If you're in crisis: Call 988 (Suicide & Crisis Lifeline) or text "HELLO" to 741741
            </span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 container mx-auto px-4 py-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-xs sm:max-w-md p-4 shadow-soft border-0 ${
                message.isUser 
                  ? 'bg-gradient-primary text-primary-foreground' 
                  : 'bg-card'
              }`}>
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </Card>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <Card className="max-w-xs p-4 shadow-soft border-0 bg-card">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card/80 backdrop-blur-sm border-t border-border px-4 py-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share what's on your mind..."
              className="flex-1 border-border/50 focus:border-primary"
            />
            <Button 
              onClick={sendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This conversation is private and anonymous. I'm here to support you. 💙
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;