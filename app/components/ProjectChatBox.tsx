"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectChatMessageRow } from "@/lib/types";

type ProjectChatBoxProps = {
  projectId: string;
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getChatErrorMessage(message: string) {
  if (
    message.includes("project_chat_messages") &&
    message.toLowerCase().includes("schema cache")
  ) {
    return "Project chat is not set up yet. Run the project_chat_messages Supabase migration, then reload this page.";
  }

  return message;
}

function sortMessages(messages: ProjectChatMessageRow[]) {
  return [...messages].sort(
    (first, second) =>
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
  );
}

function getUserLabel(user: { email?: string } | null) {
  return user?.email ?? "Unknown user";
}

function getMessageAuthor(message: ProjectChatMessageRow) {
  return message.author_label ?? `User ${message.user_id.slice(0, 8)}`;
}

export default function ProjectChatBox({ projectId }: ProjectChatBoxProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedInitialMessagesRef = useRef(false);
  const isOpenRef = useRef(false);
  const currentUserIdRef = useRef("");
  const messageIdsRef = useRef(new Set<string>());
  const [messages, setMessages] = useState<ProjectChatMessageRow[]>([]);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSending, startSendingTransition] = useTransition();

  const appendMessage = useCallback((nextMessage: ProjectChatMessageRow) => {
    if (messageIdsRef.current.has(nextMessage.id)) {
      return false;
    }

    messageIdsRef.current.add(nextMessage.id);
    setMessages((currentMessages) => sortMessages([...currentMessages, nextMessage]));
    return true;
  }, []);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    hasLoadedInitialMessagesRef.current = false;
    messageIdsRef.current = new Set();

    const loadChat = async () => {
      setLoading(true);
      setError("");

      const [{ data: userData }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("project_chat_messages")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
      ]);

      if (!mounted) {
        return;
      }

      setCurrentUserId(userData.user?.id ?? "");

      if (error) {
        setError(getChatErrorMessage(error.message));
        setMessages([]);
      } else {
        messageIdsRef.current = new Set(data.map((item) => item.id));
        setMessages(data);
      }

      hasLoadedInitialMessagesRef.current = true;
      setLoading(false);
    };

    loadChat();

    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_chat_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const nextMessage = payload.new as ProjectChatMessageRow;
          const wasAdded = appendMessage(nextMessage);

          if (
            wasAdded &&
            hasLoadedInitialMessagesRef.current &&
            !isOpenRef.current &&
            nextMessage.user_id !== currentUserIdRef.current
          ) {
            setUnreadCount((currentCount) => currentCount + 1);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [appendMessage, projectId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isOpen, messages.length]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = message.trim();

    if (!body) {
      return;
    }

    startSendingTransition(async () => {
      setError("");

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        setError(userError?.message ?? "You must be signed in to leave a message.");
        return;
      }

      const { data, error } = await supabase
        .from("project_chat_messages")
        .insert({
          project_id: projectId,
          user_id: user.id,
          message_type: "message",
          body,
          author_label: getUserLabel(user),
        })
        .select("*")
        .single();

      if (error) {
        setError(getChatErrorMessage(error.message));
        return;
      }

      setMessage("");
      appendMessage(data);
    });
  };

  const handleToggleChat = () => {
    setIsOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setUnreadCount(0);
      }

      return nextValue;
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <section
          id="project-chat-panel"
          className="flex h-[min(620px,calc(100vh-7rem))] w-[min(420px,calc(100vw-2rem))] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Chat</p>
              <h2 className="truncate text-base font-semibold text-slate-900">Project updates</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              aria-label="Close project chat"
            >
              Close
            </button>
          </div>

          {error ? (
            <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-3"
          >
            {loading ? (
              <div className="px-2 py-2 text-sm text-slate-600">Loading chat...</div>
            ) : messages.length === 0 ? (
              <div className="px-2 py-2 text-sm text-slate-600">No messages yet.</div>
            ) : (
              <div className="space-y-3">
                {messages.map((item) => {
                  const isOwnMessage = item.user_id === currentUserId;
                  const isFileUpload = item.message_type === "file_upload";

                  return (
                    <div
                      key={item.id}
                      className={`flex ${isOwnMessage && !isFileUpload ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isFileUpload
                            ? "border border-sky-200 bg-sky-50 text-sky-900"
                            : isOwnMessage
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white text-slate-900"
                        }`}
                      >
                        {isFileUpload ? (
                          <p className="font-semibold">{getMessageAuthor(item)} uploaded a file</p>
                        ) : (
                          <p
                            className={`text-xs font-semibold ${
                              isOwnMessage ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {getMessageAuthor(item)}
                          </p>
                        )}
                        {isFileUpload && item.file_name ? (
                          <p className="mt-1 break-words font-medium">{item.file_name}</p>
                        ) : null}
                        <p className="mt-1 whitespace-pre-wrap break-words">{item.body}</p>
                        <p
                          className={`mt-2 text-xs ${
                            isOwnMessage && !isFileUpload ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {formatMessageTime(item.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 bg-white p-3">
            <label htmlFor="project-chat-message" className="sr-only">
              Message
            </label>
            <textarea
              id="project-chat-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              rows={1}
              placeholder="Leave a message..."
              className="min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
            <button
              type="submit"
              disabled={isSending || !message.trim()}
              className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? "..." : "Send"}
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={handleToggleChat}
        className="relative inline-flex min-h-14 items-center gap-3 rounded-full border border-slate-200 bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-200"
        aria-expanded={isOpen}
        aria-controls="project-chat-panel"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base">
          Chat
        </span>
        <span>{isOpen ? "Hide" : "Open"} chat</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold leading-5 text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
