"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import EmojiPicker from "emoji-picker-react";
import { db, auth } from "../../../lib/firebase";

type MessageDoc = {
  id?: string;
  fromUid?: string;
  fromEmail?: string;
  fromDisplayName?: string;
  toUid?: string | null;
  toEmail?: string;
  toDisplayName?: string | null;
  text: string;
  createdAt?: { seconds: number; toMillis?: () => number } | Date | null;
  read?: boolean;
  participants?: string[];
  imageUrl?: string;
};

function formatTimestamp(ts: { seconds: number } | Date | null | undefined) {
  try {
    if (!ts) return "";
    if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
      const d = new Date(ts.seconds * 1000);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (ts instanceof Date) {
      return ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return "";
  } catch {
    return "";
  }
}

export default function ChatPage() {
  const router = useRouter();
  const routeParams = useParams();
  
  const rawPeer = Array.isArray(routeParams?.peer)
    ? routeParams.peer[0]
    : (routeParams?.peer as string) || "";
  const peerEmail = useMemo(() => decodeURIComponent(rawPeer), [rawPeer]);

  interface PeerProfile {
    id?: string;
    photoURL?: string;
    displayName?: string;
    email?: string;
    data?: () => Record<string, unknown>;
  }

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [conversationList, setConversationList] = useState<
    Array<{ peerEmail: string; peerDisplayName?: string | null; lastText?: string; lastAt?: number; unreadCount: number }>
  >([]);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [peerProfile, setPeerProfile] = useState<PeerProfile | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [messageClicked, setMessageClicked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);

  // Reset back button state if peer changes
  useEffect(() => {
    setMessageClicked(false);
  }, [peerEmail]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  // Load peer profile (optional)
  useEffect(() => {
    let cancelled = false;
    async function loadPeer() {
      try {
        if (!peerEmail) return;
        const qUsers = query(collection(db, "users"), where("email", "==", peerEmail));
        const snap = await getDocs(qUsers);
        if (!cancelled && !snap.empty) {
          setPeerProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else if (!cancelled) {
          setPeerProfile({ email: peerEmail });
        }
      } catch {
        if (!cancelled) setPeerProfile({ email: peerEmail });
      }
    }
    loadPeer();
    return () => {
      cancelled = true;
    };
  }, [peerEmail]);

  // Subscribe to all messages involving me, then filter to this peer
  useEffect(() => {
    if (!currentUser?.email) return;
    const qMy = query(collection(db, "messages"), where("participants", "array-contains", currentUser.email));
    const unsub = onSnapshot(qMy, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as MessageDoc) }));
      const filtered = items
        .filter(
          (m) => m.fromEmail === peerEmail || m.toEmail === peerEmail
        )
        .sort((a, b) => {
          const aTs = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? a.createdAt.seconds : 0;
          const bTs = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? b.createdAt.seconds : 0;
          return aTs - bTs;
        });
      setMessages(filtered as MessageDoc[]);
    });
    return () => unsub();
  }, [currentUser?.email, peerEmail]);

  // Build conversation list (latest message per peer)
  useEffect(() => {
    if (!currentUser?.email) return;
    const qMy = query(collection(db, "messages"), where("participants", "array-contains", currentUser.email));
    const unsub = onSnapshot(qMy, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as MessageDoc) }));
      const byPeer: Record<string, { peerEmail: string; peerDisplayName?: string | null; lastText?: string; lastAt?: number; unreadCount: number }> = {};
      for (const m of items) {
        const otherEmail = m.fromEmail === currentUser.email ? m.toEmail : m.fromEmail;
        if (!otherEmail) continue;
        const ts = m.createdAt && typeof m.createdAt === 'object' && 'seconds' in m.createdAt ? m.createdAt.seconds : 0;
        const displayName = m.fromEmail === otherEmail ? m.fromDisplayName : m.toDisplayName;
        if (!byPeer[otherEmail]) {
          byPeer[otherEmail] = { peerEmail: otherEmail, peerDisplayName: displayName || null, lastText: m.text, lastAt: ts, unreadCount: 0 };
        } else {
          if ((byPeer[otherEmail].lastAt || 0) < ts) {
            byPeer[otherEmail].lastAt = ts;
            byPeer[otherEmail].lastText = m.text;
            byPeer[otherEmail].peerDisplayName = displayName || byPeer[otherEmail].peerDisplayName || null;
          }
        }
        if (m.toEmail === currentUser.email && m.read === false) {
          byPeer[otherEmail].unreadCount += 1;
        }
      }
      const list = Object.values(byPeer).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
      setConversationList(list);
    });
    return () => unsub();
  }, [currentUser?.email]);

  const maskEmail = (email?: string) => {
    if (!email) return "User";
    const [local, domain] = email.split("@");
    if (!local || !domain) return "User";
    return `${local.slice(0, 2)}***@${domain}`;
  };

  // Mark unread messages from peer as read when opening
  useEffect(() => {
    if (!currentUser?.email || !peerEmail) return;
    (async () => {
      try {
        const qUnread = query(
          collection(db, "messages"),
          where("toEmail", "==", currentUser.email),
          where("fromEmail", "==", peerEmail),
          where("read", "==", false)
        );
        const snap = await getDocs(qUnread);
        await Promise.all(
          snap.docs.map((d) => updateDoc(doc(db, "messages", d.id), { read: true }))
        );
      } catch {
        // ignore
      }
    })();
  }, [currentUser?.email, peerEmail]);

  useEffect(() => {
    // auto scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUser?.email || !peerEmail) return;
    try {
      await addDoc(collection(db, "messages"), {
        fromUid: currentUser.uid,
        fromEmail: currentUser.email,
        fromDisplayName: currentUser.displayName || currentUser.email,
        toUid: null,
        toEmail: peerEmail,
        toDisplayName: peerProfile?.displayName || null,
        text: input.trim(),
        createdAt: serverTimestamp(),
        read: false,
        participants: [currentUser.email, peerEmail].filter(Boolean),
      });
      setInput("");
      setShowEmoji(false);
    } catch {
      alert("Failed to send message. Please try again.");
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleUploadImage = async (file: File) => {
    if (!file) return;
    if (!currentUser?.email || !peerEmail) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      alert('Unsupported image type');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('Image too large (max 8MB)');
      return;
    }
    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      await addDoc(collection(db, 'messages'), {
        fromUid: currentUser.uid,
        fromEmail: currentUser.email,
        fromDisplayName: currentUser.displayName || currentUser.email,
        toUid: null,
        toEmail: peerEmail,
        toDisplayName: peerProfile?.displayName || null,
        text: '',
        imageUrl: url,
        createdAt: serverTimestamp(),
        read: false,
        participants: [currentUser.email, peerEmail].filter(Boolean),
      });
      setShowEmoji(false);
    } catch (error: unknown) {
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!messageId || !currentUser?.email) return;
    if (!confirm('Delete this message?')) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch {
      alert('Failed to delete message');
    }
  };

  if (!peerEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Invalid conversation
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50" style={{ fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif' }}>
      {/* Content */}
      <div className="gap-1 px-4 sm:px-6 flex flex-1 justify-center py-5">
        {/* Left pane: conversations */}
        <aside className="flex flex-col w-72 md:w-80 sticky top-0 h-screen">
          <div className="px-4 py-3 flex-shrink-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
              aria-label="Back to dashboard"
            >
              <span className="material-icons">arrow_back</span>
              <span>Back</span>
            </button>
            <label className="flex flex-col h-12 w-full">
              <div className="flex w-full items-stretch rounded-xl h-full">
                <div className="text-[#49739c] flex bg-[#e7edf4] items-center justify-center pl-4 rounded-l-xl">
                  <span className="material-icons">search</span>
                </div>
                <input
                  placeholder="Search"
                  className="form-input flex w-full flex-1 rounded-xl text-[#0d141c] bg-[#e7edf4] h-full placeholder:text-[#49739c] px-4 rounded-l-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </label>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {(conversationList || [])
              .filter((c) => !search || c.peerEmail.toLowerCase().includes(search.toLowerCase()) || (c.peerDisplayName || '').toLowerCase().includes(search.toLowerCase()))
              .map((c) => {
                const avatarName = c.peerDisplayName || maskEmail(c.peerEmail);
                return (
                  <button
                    key={c.peerEmail}
                    className={`w-full flex items-center gap-4 bg-slate-50 px-4 min-h-[72px] py-2 hover:bg-slate-100 ${
                      c.peerEmail === peerEmail ? 'ring-1 ring-blue-200' : ''
                    }`}
                    onClick={() => router.push(`/messages/${encodeURIComponent(c.peerEmail)}`)}
                  >
                    <div
                      className="bg-center bg-no-repeat bg-cover rounded-full h-14 w-14"
                      style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName || 'User')})` }}
                    />
                    <div className="flex flex-col justify-center text-left min-w-0">
                      <p className="text-[#0d141c] text-base font-medium leading-normal truncate">{c.peerDisplayName || maskEmail(c.peerEmail)}</p>
                      <p className="text-[#49739c] text-sm leading-normal truncate">{c.lastText || ''}</p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="ml-auto bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{c.unreadCount}</span>
                    )}
                  </button>
                );
              })}
            {conversationList.length === 0 && (
              <div className="px-4 py-6 text-sm text-[#49739c]">No conversations yet</div>
            )}
          </div>
        </aside>

        {/* Right pane: conversation */}
        <section className="flex flex-col max-w-[960px] flex-1 bg-white rounded-xl border border-[#e7edf4] overflow-hidden h-screen">
          {/* Chat header: back button and peer avatar */}
          <div className="sticky top-0 z-10 bg-white border-b border-[#e7edf4] py-2 flex-shrink-0">
            <div className="relative flex items-center px-4">
              {messageClicked && (
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="p-2 mr-2 text-gray-600 hover:text-gray-900"
                  aria-label="Back to dashboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              )}
              <div className="flex-1 flex justify-center">
                <div className="w-14 h-14 rounded-full border border-gray-200 overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={peerProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerProfile?.displayName || peerProfile?.email || peerEmail)}`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Close message"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto messages-container relative min-h-0">
            {messageClicked && (
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 absolute left-4 top-4 z-10"
                aria-label="Back to dashboard"
              >
                <span className="material-icons">arrow_back</span>
                <span>Back</span>
              </button>
            )}
            <div className="flex flex-col gap-2">
              {messages.length === 0 && (
                <div className="text-center text-xs text-[#49739c] py-8">Say hi 👋</div>
              )}
              {messages.map((m) => {
                const isMine = m.fromEmail === currentUser?.email;
                const label = isMine ? 'You' : (peerProfile?.displayName || peerProfile?.email || peerEmail);
                return (
                  <div 
                    key={m.id} 
                    className={`flex items-end gap-3 p-4 ${isMine ? 'justify-end' : ''} relative group`}
                    onClick={() => setMessageClicked(true)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredMessage(m.id || null)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    {!isMine && (
                      <div
                        className="bg-center bg-no-repeat bg-cover rounded-full w-10 h-10 shrink-0"
                        style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(label)})` }}
                      />
                    )}
                    <div className={`flex flex-1 flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                      <p className={`text-[#49739c] text-[13px] max-w-[360px] ${isMine ? 'text-right' : ''}`}>{label}</p>
                      {m.imageUrl ? (
                        <div className="block max-w-[320px] rounded-xl overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.imageUrl} alt="image" className="w-full h-auto object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <p className={`text-base leading-normal flex max-w-[360px] rounded-xl px-4 py-3 ${
                          isMine ? 'bg-[#258df4] text-slate-50' : 'bg-[#e7edf4] text-[#0d141c]'
                        }`}>
                          {m.text}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#49739c]">
                          {formatTimestamp(m.createdAt)}{isMine ? (m.read ? ' · ✓✓' : ' · ✓') : ''}
                        </span>
                        {isMine && hoveredMessage === m.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessage(m.id || '');
                            }}
                            className="text-red-500 hover:text-red-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete message"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    {isMine && (
                      <div
                        className="bg-center bg-no-repeat bg-cover rounded-full w-10 h-10 shrink-0"
                        style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.email || 'You')})` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Composer */}
          <div className="sticky bottom-0 bg-white border-t border-[#e7edf4] px-4 py-3 gap-3 @container z-10 flex-shrink-0">
            <label className="flex flex-col h-12 w-full">
              <div className="flex w-full items-stretch rounded-xl h-full">
                <input
                  placeholder={currentUser ? 'Type a message' : 'Sign in to chat'}
                  className="form-input flex w-full flex-1 rounded-xl text-[#0d141c] bg-[#e7edf4] h-full placeholder:text-[#49739c] px-4 rounded-r-none pr-2"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={!currentUser}
                />
                <div className="flex bg-[#e7edf4] items-center justify-center pr-4 rounded-r-xl">
                  <div className="flex items-center gap-3 justify-end">
                    <div>
                      <button
                        type="button"
                        className="flex items-center justify-center p-1.5 text-[#49739c] hover:text-[#0d141c] relative"
                        onClick={() => setShowEmoji((v) => !v)}
                        aria-label="Toggle emoji picker"
                      >
                        <span className="material-icons">mood</span>
                        {showEmoji && (
                          <div className="absolute bottom-full right-0 mb-2 z-50 shadow-lg rounded-xl overflow-hidden bg-white border border-gray-200">
                            <EmojiPicker
                              onEmojiClick={(emojiData: { emoji: string }) => {
                                const toAdd = emojiData.emoji;
                                setInput((prev) => prev + toAdd);
                              }}
                              autoFocusSearch={false}
                              width={320}
                              height={380}
                            />
                          </div>
                        )}
                      </button>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadImage(f);
                        }}
                      />
                      <button
                        className="flex items-center justify-center p-1.5 text-[#49739c] disabled:opacity-50"
                        onClick={handlePickFile}
                        disabled={uploading}
                        aria-label="Attach image"
                      >
                        <span className="material-icons">attach_file</span>
                      </button>
                    </div>
                    <button
                      className="min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-8 px-4 bg-[#258df4] text-slate-50 text-sm font-medium hidden sm:block disabled:opacity-50"
                      onClick={sendMessage}
                      disabled={!currentUser || !input.trim()}
                    >
                      <span className="truncate">Send</span>
                    </button>
                  </div>
                </div>
              </div>
            </label>
            {/* Mobile send button */}
            <div className="sm:hidden mt-2">
              <button
                className="w-full rounded-xl h-10 bg-[#258df4] text-slate-50 text-sm font-medium disabled:opacity-50"
                onClick={sendMessage}
                disabled={!currentUser || !input.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


