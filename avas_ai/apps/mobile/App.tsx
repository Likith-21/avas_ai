import { useMemo, useRef, useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated, Dimensions } from "react-native";
import * as Speech from "expo-speech";
import Constants from "expo-constants";

let Voice: any = null;
try {
  Voice = require("@react-native-voice/voice").default;
} catch (error) {
  Voice = null;
}

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
};

const initialMessages: Message[] = [
  { role: "assistant", content: "Welcome to AVAS AI. Speak naturally or type your questions. I'm here to help! 🚀", timestamp: Date.now() }
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const apiBaseUrl = useMemo(() => {
    const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
    return extra?.apiBaseUrl ?? "http://192.168.1.100:3001";
  }, []);

  // Pulse animation for listening state
  useEffect(() => {
    if (listening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: false })
        ])
      ).start();
    }
  }, [listening, pulseAnim]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text, timestamp: Date.now() }];
    setMessages(nextMessages);
    setInput("");
    setStatus("Thinking...");
    setIsGenerating(true);

    try {
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, stream: false })
      });

      if (!response.ok) {
        setStatus("API error");
        setIsGenerating(false);
        return;
      }

      const data = await response.json();
      const assistantText = data?.message ?? "Sorry, I didn't get that.";
      const updated: Message[] = [...nextMessages, { role: "assistant", content: assistantText, timestamp: Date.now() }];
      setMessages(updated);
      setStatus("Ready");
      setIsGenerating(false);

      if (assistantText) {
        Speech.speak(assistantText, { rate: 1.0, pitch: 1.0 });
      }
      
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      setStatus("Network error");
      setIsGenerating(false);
      Alert.alert("Connection Error", `Cannot reach API at ${apiBaseUrl}. Make sure the server is running.`);
    }
  };

  const startListening = async () => {
    if (!Voice) {
      Alert.alert("Voice not ready", "Install and configure react-native-voice for speech recognition.");
      return;
    }

    try {
      Voice.onSpeechResults = (event: any) => {
        const transcript = event.value?.[0] ?? "";
        if (transcript) {
          sendMessage(transcript);
        }
      };

      Voice.onSpeechError = (error: any) => {
        setListening(false);
        setStatus("Mic error");
        console.error("Voice error:", error);
      };

      setListening(true);
      setStatus("🎤 Listening...");
      await Voice.start("en-US");
    } catch (error) {
      Alert.alert("Mic Error", "Could not start voice input.");
    }
  };

  const stopListening = async () => {
    if (!Voice) return;
    try {
      await Voice.stop();
      setListening(false);
      setStatus("Ready");
    } catch (error) {
      console.error("Stop listening error:", error);
    }
  };

  const clearChat = () => {
    Alert.alert("Clear chat?", "This cannot be undone.", [
      { text: "Cancel", onPress: () => {} },
      { text: "Clear", onPress: () => setMessages(initialMessages), style: "destructive" }
    ]);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  const messageBgColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(124, 58, 237, 0.08)", "rgba(124, 58, 237, 0.15)"]
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>⚡</Text>
          </View>
          <View>
            <Text style={styles.title}>AVAS AI</Text>
            <Text style={styles.headerStatus}>{status}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={clearChat}>
          <Text style={styles.clearBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => (
          <View
            key={`${message.role}-${index}`}
            style={[
              styles.messageWrapper,
              message.role === "user" ? styles.userWrapper : styles.assistantWrapper
            ]}
          >
            <Animated.View
              style={[
                styles.message,
                message.role === "user" ? styles.userMessage : styles.assistantMessage,
                message.role === "assistant" && listening && index === messages.length - 1 && { backgroundColor: messageBgColor }
              ]}
            >
              <Text style={[styles.messageText, message.role === "user" && styles.userText]}>
                {message.content}
              </Text>
              <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
            </Animated.View>
          </View>
        ))}
        {isGenerating && (
          <View style={[styles.messageWrapper, styles.assistantWrapper]}>
            <View style={styles.typingIndicator}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type or tap the mic..."
            placeholderTextColor="#9ca3af"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.attachBtn]}
            onPress={() => Alert.alert("Info", "File attachment coming soon!")}
          >
            <Text style={styles.attachIcon}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.voiceBtn,
              listening && styles.voiceBtnActive
            ]}
            onPress={listening ? stopListening : startListening}
          >
            <Text style={styles.voiceIcon}>{listening ? "⏹" : "🎤"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || isGenerating) && styles.sendBtnDisabled
            ]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isGenerating}
          >
            <Text style={styles.sendIcon}>{isGenerating ? "⏳" : "➤"}</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.disclaimer}>AVAS can make mistakes. Verify important info.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  
  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    borderBottomWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.1)",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center"
  },
  logoText: {
    fontSize: 24
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#7c3aed",
    letterSpacing: -0.5
  },
  headerStatus: {
    fontSize: 12,
    color: "#9ab0d6",
    marginTop: 2,
    fontWeight: "500"
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    justifyContent: "center",
    alignItems: "center"
  },
  clearBtnText: {
    fontSize: 18,
    color: "#7c3aed",
    fontWeight: "700"
  },

  /* Messages */
  messages: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  messagesContent: {
    paddingVertical: 12,
    gap: 8
  },
  messageWrapper: {
    paddingHorizontal: 8,
    marginVertical: 6
  },
  userWrapper: {
    alignItems: "flex-end"
  },
  assistantWrapper: {
    alignItems: "flex-start"
  },
  message: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  userMessage: {
    backgroundColor: "#7c3aed",
    borderBottomRightRadius: 4
  },
  userText: {
    color: "#ffffff",
    fontWeight: "600"
  },
  assistantMessage: {
    backgroundColor: "#f3f4f6",
    borderBottomLeftRadius: 4
  },
  messageText: {
    fontSize: 15,
    color: "#1f2937",
    lineHeight: 20,
    fontWeight: "500"
  },
  messageTime: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    fontWeight: "400"
  },

  /* Typing Indicator */
  typingIndicator: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1d5db"
  },
  dot1: {},
  dot2: {},
  dot3: {},

  /* Input Area */
  inputArea: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderColor: "#e5e7eb"
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "500",
    paddingVertical: 8
  },
  attachBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2
  },
  attachIcon: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "700"
  },

  /* Button Row */
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  voiceBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  voiceBtnActive: {
    backgroundColor: "#fef2f2",
    borderColor: "#dc2626"
  },
  voiceIcon: {
    fontSize: 24
  },
  sendBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  sendBtnDisabled: {
    backgroundColor: "#d1d5db",
    opacity: 0.6
  },
  sendIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "white"
  },

  /* Disclaimer */
  disclaimer: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "400"
  }
});
