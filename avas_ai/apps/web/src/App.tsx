import { useEffect, useMemo, useRef, useState } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

// Format message content with markdown-like syntax
const formatMessageContent = (content: string) => {
  if (!content) return "";

  // First, escape any HTML to prevent injection
  let formatted = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Unescape markdown patterns
  const patterns: [RegExp, string | ((match: string, ...args: any[]) => string)][] = [
    // Code blocks with backticks (MUST be first before other patterns)
    [/```(\w*)\n([\s\S]*?)```/g, (match: string, lang: string, code: string) => {
      const cleanCode = code.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      const langLabel = lang ? lang.toLowerCase() : 'code';
      return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang">${langLabel}</span></div><pre class="code-block"><code class="language-${lang || "plain"}">${cleanCode}</code></pre></div>`;
    }],
    // Code blocks from pre tags
    [/&lt;pre class=.*?&gt;([\s\S]*?)&lt;\/pre&gt;/g, "<pre class=\"code-block\"><code>$1</code></pre>"],
    // Headers
    [/^### (.*?)$/gm, "<h3>$1</h3>"],
    [/^## (.*?)$/gm, "<h2>$1</h2>"],
    [/^# (.*?)$/gm, "<h1>$1</h1>"],
    // Inline code (backticks)
    [/`([^`]+)`/g, "<code class=\"inline-code\">$1</code>"],
    // Bold
    [/\*\*([^\*]+)\*\*/g, "<strong>$1</strong>"],
    [/__([^_]+)__/g, "<strong>$1</strong>"],
    // Italic
    [/\*([^\*]+)\*/g, "<em>$1</em>"],
    [/_([^_]+)_/g, "<em>$1</em>"],
    // Numbered lists
    [/^\d+\.\s+(.*?)$/gm, "<li>$1</li>"],
    // Bullet lists
    [/^[\*\-\+]\s+(.*?)$/gm, "<li>$1</li>"],
  ];

  for (const [pattern, replacement] of patterns) {
    formatted = formatted.replace(pattern, replacement as any);
  }

  // Wrap consecutive list items in ul
  formatted = formatted.replace(/(<li>.*?<\/li>)/s, "<ul>$1</ul>");
  formatted = formatted.replace(/<\/ul>\n<ul>/g, "");

  // Preserve line breaks and paragraphs (but don't wrap block elements)
  formatted = formatted.replace(/\n\n/g, "</p><p>");
  
  // Only wrap in paragraph if it doesn't start with a block-level element
  if (!formatted.startsWith("<p>") && 
      !formatted.startsWith("<h") && 
      !formatted.startsWith("<ul") && 
      !formatted.startsWith("<div")) {
    formatted = "<p>" + formatted + "</p>";
  }

  return formatted;
};

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

type ScheduledAction = {
  id: string;
  title: string;
  schedule: string;
  enabled: boolean;
};

type Notebook = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

type PublicLink = {
  id: string;
  title: string;
  url: string;
  createdAt: number;
};

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const encodeSharePayload = (payload: unknown) => {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
};

const decodeSharePayload = (encoded: string) => {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Hi, I am AVAS. Ask me anything or tap the mic to speak."
  }
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [userLocation, setUserLocation] = useState("Loading...");
  const [activityLog, setActivityLog] = useState<Array<{timestamp: number, action: string}>>([]);
  const [personalContext, setPersonalContext] = useState("");
  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">("auto");
  const [scheduledActions, setScheduledActions] = useState<ScheduledAction[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [notebookDraft, setNotebookDraft] = useState("");
  const [publicLinks, setPublicLinks] = useState<PublicLink[]>([]);
  const [sharePreview, setSharePreview] = useState<{ title: string; messages: Message[] } | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ ok: boolean; gemini: boolean; apiKeyConfigured: boolean } | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const canUseSpeech = useMemo(() => {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const supabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  const currentUser: SupabaseUser | null = session?.user ?? null;
  const displayName = currentUser?.user_metadata?.full_name
    ?? currentUser?.user_metadata?.name
    ?? currentUser?.email?.split("@")[0]
    ?? "User";

  useEffect(() => {
    document.body.className = darkMode ? "dark" : "";
  }, [darkMode]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/models`)
      .then((res) => res.json())
      .then((data) => {
        const models = data?.models?.map((m: any) => m.name) ?? [];
        setAvailableModels(models);
      })
      .catch(() => {});

    fetch(`${apiBaseUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealthStatus(data))
      .catch(() => setHealthStatus(null));

    setChats(readJson<Chat[]>("avas-chats", []));
    setPersonalContext(readJson<string>("avas-personal-context", ""));
    setActivityLog(readJson<Array<{timestamp: number, action: string}>>("avas-activity", []));
    setScheduledActions(readJson<ScheduledAction[]>("avas-scheduled-actions", []));
    setPublicLinks(readJson<PublicLink[]>("avas-public-links", []));
    setNotebooks(readJson<Notebook[]>("avas-notebooks", []));

    const savedTheme = localStorage.getItem("avas-theme") ?? "auto";
    setThemeMode(savedTheme as "auto" | "light" | "dark");
    if (savedTheme === "dark") {
      setDarkMode(true);
    } else if (savedTheme === "light") {
      setDarkMode(false);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(prefersDark);
    }

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then((res) => res.json())
            .then((data) => {
              const location = `${data.address?.city || data.address?.town || "Unknown"}, ${data.address?.state || ""}, ${data.address?.country || ""}`;
              setUserLocation(location);
            })
            .catch(() => setUserLocation("Location unavailable"));
        },
        () => setUserLocation("Location access denied")
      );
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get("share");
    if (!shareId) return;
    const payload = localStorage.getItem(`avas-share-${shareId}`);
    if (!payload) return;
    const data = decodeSharePayload(payload);
    if (data?.messages) {
      setSharePreview({ title: data.title ?? "Shared chat", messages: data.messages });
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabaseConfigured]);

  useEffect(() => {
    localStorage.setItem("avas-chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    writeJson("avas-scheduled-actions", scheduledActions);
  }, [scheduledActions]);

  useEffect(() => {
    writeJson("avas-public-links", publicLinks);
  }, [publicLinks]);

  useEffect(() => {
    writeJson("avas-notebooks", notebooks);
  }, [notebooks]);

  useEffect(() => {
    localStorage.setItem("avas-dark-mode", String(darkMode));
  }, [darkMode]);

  // Add copy buttons to code blocks after messages render
  useEffect(() => {
    const addCopyButtons = () => {
      const codeBlocks = document.querySelectorAll('.code-block-wrapper');
      codeBlocks.forEach((wrapper) => {
        // Skip if button already exists
        if (wrapper.querySelector('.code-copy-btn')) return;

        const codeElement = wrapper.querySelector('code');
        if (!codeElement) return;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>Copy code</span>
        `;
        copyBtn.onclick = async (e) => {
          e.preventDefault();
          const code = codeElement.textContent || '';
          try {
            await navigator.clipboard.writeText(code);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Copied!</span>
            `;
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.innerHTML = originalHTML;
              copyBtn.classList.remove('copied');
            }, 2000);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
        };

        wrapper.appendChild(copyBtn);
      });
    };

    // Run after a short delay to ensure DOM is updated
    const timer = setTimeout(addCopyButtons, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  const scrollToBottom = () => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth"
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;

    logActivity(`Asked: "${text.slice(0, 30)}..."`);

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setStatus("Processing...");
    setIsGenerating(true);

    // Add placeholder for streaming response
    setMessages([...nextMessages, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const startTime = Date.now();

    try {
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, model: selectedModel, stream: true }),
        signal: controller.signal
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const detail = data?.detail ?? data?.error ?? "unknown_error";
        setStatus(`Error: ${detail}`);
        setMessages(nextMessages);
        setIsGenerating(false);
        return;
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";
        let updateCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                assistantMessage += parsed.message.content;
                // Update every character for instant, smooth streaming
                updateCount++;
                if (updateCount % 1 === 0) {
                  setMessages([...nextMessages, { role: "assistant", content: assistantMessage }]);
                  scrollToBottom();
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }

        const finalMessages: Message[] = [...nextMessages, { role: "assistant", content: assistantMessage }];
        setMessages(finalMessages);
        setStatus(assistantMessage ? "Ready" : "No reply from model.");
        setIsGenerating(false);

        // Save to current chat or create new chat
        saveChat(finalMessages);

        if (assistantMessage) {
          speak(assistantMessage);
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        setStatus("Cancelled");
      } else {
        setStatus("Network error. Is the API running?");
      }
      setMessages(nextMessages);
      setIsGenerating(false);
    }
  };

  const startListening = () => {
    if (!canUseSpeech) {
      setStatus("Speech recognition not supported in this browser.");
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("Listening...");
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus("Ready");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus("Mic error. Try again.");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        sendMessage(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const clearChat = () => {
    setMessages(initialMessages);
    setStatus("Ready");
    setCurrentChatId(null);
  };

  const saveChat = (msgs: Message[]) => {
    if (currentChatId) {
      // Update existing chat
      setChats(chats.map(chat =>
        chat.id === currentChatId
          ? { ...chat, messages: msgs, title: generateChatTitle(msgs) }
          : chat
      ));
    } else {
      // Create new chat
      const newChat: Chat = {
        id: Date.now().toString(),
        title: generateChatTitle(msgs),
        messages: msgs,
        createdAt: Date.now()
      };
      setChats([newChat, ...chats]);
      setCurrentChatId(newChat.id);
    }
  };

  const generateChatTitle = (msgs: Message[]): string => {
    const userMsg = msgs.find(m => m.role === "user");
    if (userMsg) {
      return userMsg.content.slice(0, 50) + (userMsg.content.length > 50 ? "..." : "");
    }
    return "New chat";
  };

  const loadChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chatId);
      setStatus("Ready");
      logActivity(`Opened chat: "${chat.title.substring(0, 30)}"...`);
    }
  };

  const deleteChat = (chatId: string) => {
    setChats(chats.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      clearChat();
    }
  };

  const renameChat = (chatId: string, newTitle: string) => {
    setChats(chats.map(chat =>
      chat.id === chatId ? { ...chat, title: newTitle } : chat
    ));
  };

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setAuthError("");
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setAuthLoading(false);
    setAuthError("");
  };

  const signInWithEmail = async () => {
    if (!supabaseConfigured) {
      setAuthError("Supabase is not configured.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    });
    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    logActivity("Signed in");
    closeAuth();
  };

  const signUpWithEmail = async () => {
    if (!supabaseConfigured) {
      setAuthError("Supabase is not configured.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: {
        data: {
          full_name: authName
        }
      }
    });
    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    logActivity("Signed up");
    closeAuth();
  };

  const signInWithGoogle = async () => {
    if (!supabaseConfigured) {
      setAuthError("Supabase is not configured.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    if (!supabaseConfigured) {
      setShowAccount(false);
      return;
    }
    await supabase.auth.signOut();
    setShowAccount(false);
    logActivity("Signed out");
  };

  const logActivity = (action: string) => {
    const newLog = [...activityLog, { timestamp: Date.now(), action }];
    setActivityLog(newLog);
    localStorage.setItem("avas-activity", JSON.stringify(newLog));
  };

  const savePersonalContext = (context: string) => {
    setPersonalContext(context);
    localStorage.setItem("avas-personal-context", context);
  };

  const getRecentActivity = () => {
    return activityLog.slice(-10).reverse().map((log) => ({
      ...log,
      date: new Date(log.timestamp).toLocaleString()
    }));
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setStatus("Copied to clipboard!");
    setTimeout(() => setStatus("Ready"), 2000);
  };

  const exportChat = () => {
    const text = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\\n\\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avas-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addScheduledAction = () => {
    const title = prompt("Task name:");
    if (!title) return;
    const schedule = prompt("Schedule (e.g. every day at 9am):", "Every day at 9am") ?? "";
    const newAction: ScheduledAction = {
      id: Date.now().toString(),
      title,
      schedule,
      enabled: true
    };
    setScheduledActions([newAction, ...scheduledActions]);
    logActivity(`Added scheduled task: ${title}`);
  };

  const toggleScheduledAction = (id: string) => {
    setScheduledActions(actions =>
      actions.map(action => action.id === id ? { ...action, enabled: !action.enabled } : action)
    );
  };

  const removeScheduledAction = (id: string) => {
    setScheduledActions(actions => actions.filter(action => action.id !== id));
  };

  const createPublicLink = () => {
    const lastUserMessage = messages.findLast(m => m.role === "user")?.content ?? "Chat";
    const title = prompt("Link title:", lastUserMessage.slice(0, 40)) ?? "Shared chat";
    if (!title) return;
    const payload = {
      title,
      messages
    };
    const shareId = Date.now().toString();
    const url = `${window.location.origin}/?share=${shareId}`;
    const newLink: PublicLink = {
      id: shareId,
      title,
      url,
      createdAt: Date.now()
    };
    setPublicLinks([newLink, ...publicLinks]);
    localStorage.setItem(`avas-share-${shareId}`, encodeSharePayload(payload));
    logActivity("Created public link");
  };

  const copyPublicLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setStatus("Link copied!");
    setTimeout(() => setStatus("Ready"), 2000);
  };

  const deletePublicLink = (id: string) => {
    setPublicLinks(links => links.filter(link => link.id !== id));
    localStorage.removeItem(`avas-share-${id}`);
  };

  const createNotebook = () => {
    const title = prompt("Notebook title:", "New notebook") ?? "New notebook";
    if (!title) return;
    const notebook: Notebook = {
      id: Date.now().toString(),
      title,
      content: "",
      updatedAt: Date.now()
    };
    setNotebooks([notebook, ...notebooks]);
    setActiveNotebookId(notebook.id);
    setNotebookDraft("");
    logActivity(`Created notebook: ${title}`);
  };

  const saveNotebook = () => {
    if (!activeNotebookId) return;
    setNotebooks(list =>
      list.map(nb => nb.id === activeNotebookId
        ? { ...nb, content: notebookDraft, updatedAt: Date.now() }
        : nb
      )
    );
    setStatus("Notebook saved");
    setTimeout(() => setStatus("Ready"), 1500);
  };

  const openNotebook = (id: string) => {
    const notebook = notebooks.find(nb => nb.id === id);
    if (!notebook) return;
    setActiveNotebookId(id);
    setNotebookDraft(notebook.content);
  };

  const deleteNotebook = (id: string) => {
    setNotebooks(list => list.filter(nb => nb.id !== id));
    if (activeNotebookId === id) {
      setActiveNotebookId(null);
      setNotebookDraft("");
    }
  };

  const sendFeedback = () => {
    const subject = "AVAS Feedback";
    const body = encodeURIComponent("Tell us what you think about AVAS...");
    window.location.href = `mailto:support@avas.ai?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const viewHelp = () => {
    setHelpOpen(true);
  };

  const updateLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then((res) => res.json())
          .then((data) => {
            const location = `${data.address?.city || data.address?.town || "Unknown"}, ${data.address?.state || ""}, ${data.address?.country || ""}`;
            setUserLocation(location);
            logActivity("Updated location");
          })
          .catch(() => setUserLocation("Location unavailable"));
      },
      () => setUserLocation("Location access denied")
    );
  };

  const stopGenerating = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setStatus("Stopped");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarExpanded ? "" : "collapsed"}`}>
        <div className="sidebar-header">
          <button className="menu-btn" onClick={() => setSidebarExpanded(!sidebarExpanded)} title="Toggle sidebar">☰</button>
          {sidebarExpanded && (
            <>
              <div className="brand-logo">
                <div className="brand-mark">AV</div>
                <span className="brand-name">AVAS</span>
              </div>
            </>
          )}
        </div>
        
        <div className="sidebar-content">
          {sidebarExpanded && (
            <>
              <button className="new-chat-btn" onClick={clearChat}>
                <span className="plus-icon">+</span>
                <span>New chat</span>
              </button>
              <div className="chat-history">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`chat-item ${currentChatId === chat.id ? "active" : ""}`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <span className="chat-title">{chat.title}</span>
                    <div className="chat-actions">
                      <button
                        className="chat-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newTitle = prompt("Rename chat:", chat.title);
                          if (newTitle) renameChat(chat.id, newTitle);
                        }}
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        className="chat-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this chat?")) deleteChat(chat.id);
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <button className={`sidebar-settings-btn ${sidebarExpanded ? "expanded" : ""}`} onClick={() => setShowSettings(true)} title="Settings">
            {sidebarExpanded ? (
              <>
                <span className="btn-icon">⚙️</span>
                <span className="btn-text">Settings</span>
              </>
            ) : (
              <span className="btn-icon">⚙️</span>
            )}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h1 className="page-title">AVAS AI</h1>
          <div className="top-controls">
            <button className="icon-btn" onClick={exportChat} title="Export chat">
              💾
            </button>
            <select
              className="model-selector"
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                logActivity(`Switched to model: ${e.target.value}`);
              }}
              title="Select model"
            >
              {availableModels.length > 0 ? (
                availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              ) : (
                <option value={selectedModel}>{selectedModel}</option>
              )}
            </select>
            {currentUser ? (
              <div className="account-menu-container">
                <button
                  className="account-avatar-btn"
                  onClick={() => setShowAccount(!showAccount)}
                  title="Account"
                >
                  <span className="avatar-initial">{displayName[0].toUpperCase()}</span>
                </button>
              </div>
            ) : (
              <button className="sign-in-btn" onClick={() => openAuth("signin")}>
                Log in
              </button>
            )}
          </div>
        </header>

        <div className="messages-container">
          <div className="messages" ref={listRef}>
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
                {message.content && (
                  <button
                    className="copy-btn"
                    onClick={() => copyMessage(message.content)}
                    title="Copy message"
                  >
                    📋
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={`input-section ${sidebarExpanded ? "" : "expanded"}`}>
          <div className="input-wrapper">
            <textarea
              rows={1}
              placeholder="Ask AVAS anything..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              className="main-input"
            />
            <div className="input-controls">
              <button
                className="icon-btn-small"
                onClick={isListening ? stopListening : startListening}
                disabled={isGenerating}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? "🛑" : "🎤"}
              </button>
              {isGenerating ? (
                <button className="send-btn" onClick={stopGenerating} title="Stop">
                  ⏹
                </button>
              ) : (
                <button 
                  className="send-btn" 
                  onClick={() => sendMessage(input)} 
                  disabled={!input.trim()}
                  title="Send message"
                >
                  ➤
                </button>
              )}
            </div>
          </div>
          <div className="input-footer">
            <span className="status-text">{status}</span>
            <button
              className="text-btn"
              onClick={() => speak(messages.at(-1)?.content ?? "")}
              disabled={isSpeaking || isGenerating}
            >
              {isSpeaking ? "🔊 Speaking..." : "🔊 Read last"}
            </button>
          </div>
          <p className="disclaimer">AVAS AI can make mistakes. Verify important information.</p>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="close-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="settings-list">
              
              {/* Activity */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">⏱️</span>
                  Activity
                </h3>
                <div className="activity-list">
                  {getRecentActivity().length > 0 ? (
                    getRecentActivity().map((log, i) => (
                      <div key={i} className="activity-item">
                        <span className="activity-action">{log.action}</span>
                        <span className="activity-time">{log.date}</span>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No activity yet</p>
                  )}
                </div>
              </div>

              {/* Personal Context */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">👤</span>
                  Personal Context
                </h3>
                <p className="settings-description">Help AVAS understand you better</p>
                <textarea
                  className="context-textarea"
                  placeholder="Tell AVAS about yourself, your preferences, interests, profession, etc..."
                  value={personalContext}
                  onChange={(e) => savePersonalContext(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Connected Apps */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">🔗</span>
                  Connected Apps
                  <span className="settings-badge">●</span>
                </h3>
                <p className="settings-description">Manage your connected applications</p>
                <div className="connected-apps">
                  <div className="app-item">
                    <span>Google Gemini 2.5 Flash</span>
                    <span className="status-connected">Connected</span>
                  </div>
                  {healthStatus && (
                    <div className="app-item">
                      <span>API health</span>
                      <span className={healthStatus.ok ? "status-connected" : "status-warning"}>
                        {healthStatus.ok ? "Healthy" : "Down"}
                      </span>
                    </div>
                  )}
                  <div className="app-item">
                    <span>Supabase Auth</span>
                    <span className={supabaseConfigured ? "status-connected" : "status-warning"}>
                      {supabaseConfigured ? "Configured" : "Missing keys"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scheduled Actions */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">⏲️</span>
                  Scheduled Actions
                </h3>
                <p className="settings-description">Set up automated tasks</p>
                <button className="action-btn" onClick={addScheduledAction}>+ Add Scheduled Task</button>
                {scheduledActions.length > 0 && (
                  <div className="scheduled-list">
                    {scheduledActions.map(action => (
                      <div key={action.id} className="scheduled-item">
                        <div>
                          <p className="scheduled-title">{action.title}</p>
                          <p className="scheduled-meta">{action.schedule}</p>
                        </div>
                        <div className="scheduled-actions">
                          <button
                            className={`chip-btn ${action.enabled ? "active" : ""}`}
                            onClick={() => toggleScheduledAction(action.id)}
                          >
                            {action.enabled ? "Enabled" : "Paused"}
                          </button>
                          <button className="chip-btn danger" onClick={() => removeScheduledAction(action.id)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Public Links/Share */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">🔗</span>
                  Your Public Links
                </h3>
                <p className="settings-description">Share conversations anonymously</p>
                <button className="action-btn" onClick={createPublicLink}>+ Create Public Link</button>
                {publicLinks.length > 0 && (
                  <div className="public-links">
                    {publicLinks.map(link => (
                      <div key={link.id} className="public-link-item">
                        <div>
                          <p className="public-link-title">{link.title}</p>
                          <p className="public-link-url">{link.url}</p>
                        </div>
                        <div className="public-link-actions">
                          <button className="chip-btn" onClick={() => copyPublicLink(link.url)}>Copy</button>
                          <button className="chip-btn danger" onClick={() => deletePublicLink(link.id)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">🎨</span>
                  Theme
                </h3>
                <div className="theme-options">
                  {["auto", "light", "dark"].map((t) => (
                    <button
                      key={t}
                      className={`theme-btn ${themeMode === t ? "active" : ""}`}
                      onClick={() => {
                        setThemeMode(t as "auto" | "light" | "dark");
                        if (t === "dark") {
                          setDarkMode(true);
                        } else if (t === "light") {
                          setDarkMode(false);
                        } else {
                          // Auto: detect system preference
                          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                          setDarkMode(prefersDark);
                        }
                        localStorage.setItem("avas-theme", t);
                        logActivity(`Changed theme to: ${t}`);
                      }}
                    >
                      {t === "auto" ? "🔄 Auto" : t === "light" ? "☀️ Light" : "🌙 Dark"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manage Subscription */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">💳</span>
                  Manage Subscription
                </h3>
                <p className="settings-description">Currently on Free Plan</p>
                <button className="action-btn" onClick={() => setUpgradeOpen(true)}>View Plans</button>
              </div>

              {/* Upgrade */}
              <div className="settings-section upgrade-section">
                <h3 className="settings-title">
                  <span className="settings-icon">✨</span>
                  Upgrade to AVAS Pro
                </h3>
                <p className="settings-description">Get access to advanced features and priority support</p>
                <button className="upgrade-btn" onClick={() => setUpgradeOpen(true)}>Upgrade Now</button>
              </div>

              {/* NotebookLM Alternative */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">📓</span>
                  AVAS Notebooks
                </h3>
                <p className="settings-description">Create AI notebooks for research and learning</p>
                <button className="action-btn" onClick={createNotebook}>+ Create Notebook</button>
                {notebooks.length > 0 && (
                  <div className="notebook-list">
                    {notebooks.map(note => (
                      <div key={note.id} className={`notebook-item ${activeNotebookId === note.id ? "active" : ""}`}>
                        <button className="notebook-open" onClick={() => openNotebook(note.id)}>
                          <span>{note.title}</span>
                          <span className="notebook-date">{new Date(note.updatedAt).toLocaleDateString()}</span>
                        </button>
                        <button className="chip-btn danger" onClick={() => deleteNotebook(note.id)}>Delete</button>
                      </div>
                    ))}
                  </div>
                )}
                {activeNotebookId && (
                  <div className="notebook-editor">
                    <textarea
                      className="context-textarea"
                      rows={6}
                      placeholder="Write notes, summarize research, keep snippets..."
                      value={notebookDraft}
                      onChange={(e) => setNotebookDraft(e.target.value)}
                    />
                    <button className="action-btn" onClick={saveNotebook}>Save notebook</button>
                  </div>
                )}
              </div>

              {/* Send Feedback */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">💬</span>
                  Send Feedback
                </h3>
                <p className="settings-description">Help us improve AVAS</p>
                <button className="action-btn" onClick={sendFeedback}>Send Feedback</button>
              </div>

              {/* Help */}
              <div className="settings-section">
                <h3 className="settings-title">
                  <span className="settings-icon">❓</span>
                  Help
                  <span className="settings-arrow">→</span>
                </h3>
                <p className="settings-description">View documentation and FAQs</p>
                <button className="action-btn" onClick={viewHelp}>Open help</button>
              </div>

              {/* Location */}
              <div className="settings-section location-section">
                <div className="location-info">
                  <span className="location-icon">📍</span>
                  <div>
                    <p className="location-title">{userLocation}</p>
                    <p className="location-subtitle">From your IP address • <button className="update-link" onClick={updateLocation}>Update location</button></p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Account Dropdown Menu */}
      {showAccount && currentUser && (
        <>
          <div className="account-menu-overlay" onClick={() => setShowAccount(false)} />
          <div className="account-dropdown">
            <div className="account-dropdown-header">
              <p className="account-email">{currentUser.email}</p>
              <button 
                className="close-dropdown-btn" 
                onClick={() => setShowAccount(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="account-dropdown-profile">
              <div className="account-avatar-large">{displayName[0].toUpperCase()}</div>
              <h3 className="account-greeting">Hi, {displayName}!</h3>
              <button className="manage-account-btn">
                Manage your AVAS Account
              </button>
            </div>

            <div className="account-dropdown-actions">
              <button className="add-account-btn">
                <span className="btn-icon">+</span>
                Add account
              </button>
              <button className="sign-out-btn" onClick={() => {
                signOut();
                setShowAccount(false);
              }}>
                <span className="btn-icon">→</span>
                Sign out
              </button>
            </div>

            <div className="account-dropdown-footer">
              <a href="#" className="footer-link">Privacy Policy</a>
              <span className="footer-separator">•</span>
              <a href="#" className="footer-link">Terms of Service</a>
            </div>
          </div>
        </>
      )}

      {authOpen && (
        <div className="modal-overlay" onClick={closeAuth}>
          <div className="modal auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{authMode === "signin" ? "Welcome back" : "Create your account"}</h2>
              <button className="close-btn" onClick={closeAuth}>✕</button>
            </div>
            <div className="auth-content">
              <button className="auth-provider-btn" onClick={signInWithGoogle} disabled={authLoading}>
                Continue with Google
              </button>
              <div className="auth-divider">
                <span>or</span>
              </div>
              {authMode === "signup" && (
                <input
                  className="auth-input"
                  placeholder="Full name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                />
              )}
              <input
                className="auth-input"
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                className="auth-input"
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              {authError && <p className="auth-error">{authError}</p>}
              <button
                className="auth-submit-btn"
                onClick={authMode === "signin" ? signInWithEmail : signUpWithEmail}
                disabled={authLoading}
              >
                {authLoading ? "Please wait..." : authMode === "signin" ? "Sign in" : "Sign up"}
              </button>
              <p className="auth-toggle">
                {authMode === "signin" ? "New to AVAS?" : "Already have an account?"}
                <button
                  className="auth-link"
                  onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
                >
                  {authMode === "signin" ? "Create account" : "Sign in"}
                </button>
              </p>
              {!supabaseConfigured && (
                <p className="auth-hint">Add Supabase keys in apps/web/.env to enable login.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {upgradeOpen && (
        <div className="modal-overlay" onClick={() => setUpgradeOpen(false)}>
          <div className="modal upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upgrade to AVAS Pro</h2>
              <button className="close-btn" onClick={() => setUpgradeOpen(false)}>✕</button>
            </div>
            <div className="upgrade-grid">
              <div className="upgrade-card">
                <h3>Free</h3>
                <p className="upgrade-price">$0</p>
                <ul>
                  <li>Gemini Flash access</li>
                  <li>Standard rate limits</li>
                  <li>Basic memory</li>
                </ul>
              </div>
              <div className="upgrade-card featured">
                <h3>Pro</h3>
                <p className="upgrade-price">$19/mo</p>
                <ul>
                  <li>Priority performance</li>
                  <li>Advanced tools</li>
                  <li>Extended memory</li>
                </ul>
                <button className="upgrade-btn">Start Pro</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="modal-overlay" onClick={() => setHelpOpen(false)}>
          <div className="modal help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Help & FAQs</h2>
              <button className="close-btn" onClick={() => setHelpOpen(false)}>✕</button>
            </div>
            <div className="help-content">
              <h3>Getting started</h3>
              <p>Set your Gemini API key in .env and start the API and web apps.</p>
              <h3>Voice input</h3>
              <p>Use the mic button and allow microphone access in your browser.</p>
              <h3>Account</h3>
              <p>Configure Supabase keys to enable email and Google login.</p>
            </div>
          </div>
        </div>
      )}

      {sharePreview && (
        <div className="modal-overlay" onClick={() => setSharePreview(null)}>
          <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{sharePreview.title}</h2>
              <button className="close-btn" onClick={() => setSharePreview(null)}>✕</button>
            </div>
            <div className="share-preview">
              {sharePreview.messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-content" dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
