import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../constants/firebase";
import { mobileApi } from "../../constants/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "What do my cholesterol results mean?",
  "I have a headache and fever. What should I do?",
  "Explain hypertension Stage 1.",
  "What is HbA1c and what's a normal range?",
];

export default function ChatScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // Load previous chat history on mount
  const loadHistory = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) return;
    setHistoryLoading(true);
    try {
      const data = await mobileApi.getChatHistory(uid);
      if (Array.isArray(data)) {
        const msgs: Message[] = data
          .flatMap((record: any) => [
            {
              id: `${record.id}-user`,
              role: "user" as const,
              content: record.query,
              timestamp: record.timestamp ?? "",
            },
            {
              id: `${record.id}-ai`,
              role: "assistant" as const,
              content: record.answer,
              timestamp: record.timestamp ?? "",
            },
          ])
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        setMessages(msgs);
      }
    } catch {
      // Silent fail — start with a fresh session
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async (text: string) => {
    const uid = user?.uid;
    if (!uid || !text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const data = await mobileApi.sendChat(uid, text.trim());
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.answer ?? "I could not generate a response.",
        timestamp: data.timestamp ?? new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Error: ${err.message ?? "Backend not reachable. Please ensure the PulseMind server is running on port 8000."}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.msgContainer,
          isUser ? styles.msgUser : styles.msgAI,
        ]}
      >
        {!isUser && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>🧠 PulseMind AI</Text>
          </View>
        )}
        <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAI]}>
          {item.content}
        </Text>
        <Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>
          {item.timestamp
            ? new Date(item.timestamp).toLocaleTimeString("en", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Quick Prompts */}
      {messages.length === 0 && !historyLoading && (
        <View style={styles.quickPromptsSection}>
          <Text style={styles.quickPromptsTitle}>Try asking…</Text>
          <View style={styles.quickPromptsList}>
            {QUICK_PROMPTS.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.quickPromptBtn}
                onPress={() => sendMessage(p)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickPromptText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Message List */}
      {historyLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#06b6d4" size="large" />
          <Text style={styles.loadingText}>Loading chat history…</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyListEmoji}>💬</Text>
              <Text style={styles.emptyListText}>
                Ask me anything about your health records, medications, symptoms,
                or lab results.
              </Text>
            </View>
          }
        />
      )}

      {/* Typing indicator */}
      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#06b6d4" />
          <Text style={styles.typingText}>PulseMind AI is thinking…</Text>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a health question…"
          placeholderTextColor="#4b5563"
          multiline
          maxLength={2000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => sendMessage(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030712",
  },
  quickPromptsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  quickPromptsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickPromptsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickPromptBtn: {
    backgroundColor: "#111827",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickPromptText: {
    fontSize: 12,
    color: "#60a5fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyListEmoji: {
    fontSize: 40,
  },
  emptyListText: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 20,
  },
  msgContainer: {
    maxWidth: "85%",
    borderRadius: 18,
    padding: 12,
  },
  msgUser: {
    alignSelf: "flex-end",
    backgroundColor: "#1e40af",
    borderBottomRightRadius: 4,
  },
  msgAI: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderBottomLeftRadius: 4,
  },
  aiBadge: {
    marginBottom: 6,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#06b6d4",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextUser: {
    color: "#e0f2fe",
  },
  msgTextAI: {
    color: "#e5e7eb",
  },
  msgTime: {
    fontSize: 10,
    color: "#60a5fa",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  msgTimeUser: {
    color: "#93c5fd",
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: "#06b6d4",
    fontStyle: "italic",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    backgroundColor: "#0f172a",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#ffffff",
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#374151",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#06b6d4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
