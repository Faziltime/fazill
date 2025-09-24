"use client";
import React, { useState, useEffect, useMemo } from "react";
import ProfileModal from "./ProfileModal";
import SupportersModal from "./SupportersModal";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { SearchProvider, useSearch } from "./SearchContext";
import { usePathname } from "next/navigation";



function TopBar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [supportersOpen, setSupportersOpen] = useState(false);
  const { searchTerm, setSearchTerm } = useSearch();
  const pathname = usePathname();
  const hideRightIcons = pathname?.startsWith("/messages");

  // Typing placeholder animation (ported from dashboard)
  const placeholderTexts = useMemo(() => [
    "Connect with others...",
    "Search for solutions...",
    "Find community support...",
    "Discover helpful advice...",
    "Share your experience..."
  ], []);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(0);
  const [typingIndex, setTypingIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedPlaceholder((prev) => (prev + 1) % placeholderTexts.length);
      setTypingIndex(0);
      setIsTyping(true);
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!isTyping) return;
    const currentText = placeholderTexts[animatedPlaceholder];
    if (typingIndex < currentText.length) {
      const timeout = setTimeout(() => setTypingIndex((p) => p + 1), 100);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setIsTyping(false), 1000);
    return () => clearTimeout(timeout);
  }, [typingIndex, isTyping, animatedPlaceholder, placeholderTexts]);
  const getCurrentPlaceholder = () => {
    const currentText = placeholderTexts[animatedPlaceholder];
    return currentText.substring(0, typingIndex);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 p-4 bg-white shadow fixed top-0 left-0 right-0 z-50 w-full">
      <div className="justify-self-center w-full max-w-xl relative group">
        <input
            type="text"
            placeholder={getCurrentPlaceholder()}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-2.5 pl-12 bg-white/95 border border-gray-200 rounded-2xl shadow focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400 text-[15px]"
          />
        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
      </div>
      {!hideRightIcons && (
      <div className="flex items-center gap-4 justify-self-end whitespace-nowrap relative">
        <button
          onClick={() => setSupportersOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 text-white text-sm font-mono tracking-tight shadow-md ring-1 ring-black/10 hover:shadow-lg hover:-translate-y-0.5 transition duration-200"
          aria-label="View supporters"
        >
          <span className="material-icons" style={{ fontSize: 18 }}>groups</span>
          <span>supporters</span>
        </button>
        <a
          href="https://buymeacoffee.com/faziltimedo"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 text-white text-sm font-mono tracking-tight shadow-md ring-1 ring-black/10 hover:shadow-lg hover:-translate-y-0.5 transition duration-200"
          aria-label="Become a supporter"
        >
          <span className="material-icons" style={{ fontSize: 18 }}>waving_hand</span>
          <span>Become a Supporter</span>
        </a>
        <button
          onClick={() => setProfileOpen(true)}
          className="rounded-full p-1 hover:bg-gray-100 transition"
          aria-label="Open profile"
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="me" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
          ) : (
            <span className="material-icons" style={{ fontSize: 32 }}>account_circle</span>
          )}
        </button>
        {profileOpen && (
          <ProfileModal 
            user={user ? {
              displayName: user.displayName || undefined,
              email: user.email || undefined,
              photoURL: user.photoURL || undefined,
              uid: user.uid
            } : null} 
            onClose={() => setProfileOpen(false)} 
            currentUserEmail={user?.email || undefined} 
          />
        )}
        {supportersOpen && (
          <SupportersModal onCloseAction={() => setSupportersOpen(false)} />
        )}
      </div>
      )}
    </div>
  );
}

export default function ClientLayoutShell({ children }: { children: React.ReactNode }) {

  return (
    <SearchProvider>
      <TopBar />
      <div className="h-16" />
      {children}
    </SearchProvider>
  );
}