"use client";
import React, { useState, useEffect } from "react";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, serverTimestamp, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useRouter } from "next/navigation";

interface User {
  displayName?: string;
  email?: string;
  photoURL?: string;
  uid?: string;
}

interface Post {
  id: string;
  title: string;
  problem: string;
  category: string;
  user: string;
  userDisplayName?: string;
  userPhoto?: string;
  upvotes?: number;
  downvotes?: number;
  createdAt?: { seconds: number };
}

interface Comment {
  id: string;
  text: string;
  user: string;
  userDisplayName?: string;
  likes?: number;
  createdAt?: { seconds: number };
}

interface Reply {
  id: string;
  text: string;
  user: string;
  userDisplayName?: string;
  createdAt?: { seconds: number };
}

interface ProfileModalProps {
  user: User | null;
  onClose: () => void;
  showBackButton?: boolean;
  currentUserEmail?: string;
}

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'mental health': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'relationship': return 'bg-pink-100 text-pink-800 border-pink-200';
    case 'school': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'finance': return 'bg-green-100 text-green-800 border-green-200';
    case 'health': return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'career': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'family': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'personal growth': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'technology': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'other': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatDate = (date: { seconds?: number } | Date | string | null | undefined) => {
  if (!date) return '';
  if (typeof date === 'object' && date !== null && 'seconds' in date && date.seconds) {
    return new Date(date.seconds * 1000).toLocaleString();
  }
  if (date instanceof Date) {
    return date.toLocaleString();
  }
  return String(date);
};

const ProfilePostFullView: React.FC<{ post: Post, user: User, onClose: () => void, onUserClick: (email: string) => void }> = ({ post, user, onClose, onUserClick }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [userVote, setUserVote] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const getUserDisplayName = (userEmail: string, userDisplayName?: string) => {
    if (user && userEmail === user.email) {
      return userDisplayName || userEmail;
    }
    if (userDisplayName) {
      return userDisplayName;
    }
    const [localPart, domain] = userEmail.split('@');
    if (localPart && domain) {
      return `${localPart.substring(0, 2)}***@${domain}`;
    }
    return 'Anonymous User';
  };

  useEffect(() => {
    const fetchComments = async () => {
      const q = query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      setComments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    };
    fetchComments();
  }, [post.id]);

  useEffect(() => {
    const fetchUserVote = async () => {
      if (!user || !post || !user.uid) return setUserVote(null);
      const voteDoc = await getDoc(doc(db, "posts", post.id, "votes", user.uid));
      if (voteDoc.exists()) setUserVote(voteDoc.data().type);
      else setUserVote(null);
    };
    fetchUserVote();
  }, [user, post]);

  const handleVote = async (type: "like" | "dislike") => {
    if (!user || !user.uid) return;
    const voteDocRef = doc(db, "posts", post.id, "votes", user.uid);
    const postDocRef = doc(db, "posts", post.id);
    const voteSnap = await getDoc(voteDocRef);
    let newUpvotes = post.upvotes || 0;
    let newDownvotes = post.downvotes || 0;
    if (!voteSnap.exists()) {
      await setDoc(voteDocRef, { type });
      if (type === 'like') newUpvotes++;
      else newDownvotes++;
    } else if (voteSnap.data().type === type) {
      await deleteDoc(voteDocRef);
      if (type === 'like') newUpvotes--;
      else newDownvotes--;
    } else {
      await setDoc(voteDocRef, { type });
      if (type === 'like') { newUpvotes++; newDownvotes--; }
      else { newDownvotes++; newUpvotes--; }
    }
    await updateDoc(postDocRef, { upvotes: newUpvotes, downvotes: newDownvotes });
    setUserVote(prev => (prev === type ? null : type));
  };

  const handleAddComment = async () => {
    if (!user || !commentInput.trim()) return;
    await addDoc(collection(db, "posts", post.id, "comments"), {
      text: commentInput,
      user: user.email || "user",
      createdAt: serverTimestamp(),
    });
    setCommentInput("");
    const q = query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    setComments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
  };

  useEffect(() => {
    async function fetchReplies() {
      if (!post || !comments.length) return;
      const allReplies: Record<string, Reply[]> = {};
      for (const comment of comments) {
        const q = query(collection(db, "posts", post.id, "comments", comment.id, "replies"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        allReplies[comment.id] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reply));
      }
      setReplies(allReplies);
    }
    fetchReplies();
  }, [post, comments]);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col w-screen h-screen overflow-y-auto">
      <button className="absolute top-4 right-6 text-gray-400 hover:text-gray-700 z-10" onClick={onClose}>
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>
      <div className="flex flex-col flex-1 justify-center items-center w-full h-full pt-16 pb-8 px-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-200 p-12 mx-auto text-lg">
          <div className="flex flex-col items-center mb-6">
            <img
              src={post.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userDisplayName || post.user)}`}
              alt={post.userDisplayName || post.user}
              className="w-14 h-14 rounded-full border border-gray-200 shadow mb-2"
            />
            <span className="text-base font-medium text-gray-700 hover:underline cursor-pointer" onClick={() => onUserClick(post.user)}>
              {post.userDisplayName || post.user}
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-black">{post.title}</h2>
          <p className="mb-2 text-black">{post.problem}</p>
          <div className="mb-4">
            <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${getCategoryColor(post.category)}`}>
              {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
            </span>
          </div>
          <div className="flex items-center space-x-4 mb-4">
            <button className={`flex items-center ${userVote === 'like' ? 'text-blue-600 font-bold' : 'text-gray-600'} hover:text-blue-600`} onClick={() => handleVote('like')}>
              <span className="material-symbols-outlined mr-1">thumb_up</span> {post.upvotes || 0}
            </button>
            <button className={`flex items-center ${userVote === 'dislike' ? 'text-red-600 font-bold' : 'text-gray-600'} hover:text-red-600`} onClick={() => handleVote('dislike')}>
              <span className="material-symbols-outlined mr-1">thumb_down</span> {post.downvotes || 0}
            </button>
          </div>
          <div className="mb-2 font-semibold text-black">Comments</div>
          <div className="flex flex-col gap-2 mb-4 max-h-40 overflow-y-auto">
            {comments.length === 0 && <div className="text-gray-400 text-sm">No comments yet.</div>}
            {comments.map((c) => (
              <div key={c.id} className="bg-gray-100 rounded p-2 text-black">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600 mb-1">{getUserDisplayName(c.user, c.userDisplayName)}</div>
                  <div className="text-xs text-gray-400 ml-2">{formatDate(c.createdAt)}</div>
                </div>
                <div className="text-sm mb-1">{c.text}</div>
                <div className="flex items-center gap-3 text-xs">
                  <button className="flex items-center text-gray-500 hover:text-blue-600">
                    <span className="material-symbols-outlined text-base mr-1">thumb_up</span> {c.likes || 0}
                  </button>
                  {replies[c.id] && replies[c.id].length > 0 && (
                    <button className="flex items-center text-gray-500 hover:text-blue-600" onClick={() => {
                      const newExpanded = new Set(expandedReplies);
                      if (newExpanded.has(c.id)) {
                        newExpanded.delete(c.id);
                      } else {
                        newExpanded.add(c.id);
                      }
                      setExpandedReplies(newExpanded);
                    }}>
                      <span className="material-symbols-outlined text-base mr-1">expand_more</span> 
                      {expandedReplies.has(c.id) ? 'Hide Replies' : `Show Replies (${replies[c.id].length})`}
                    </button>
                  )}
                </div>
                {replies[c.id] && replies[c.id].length > 0 && expandedReplies.has(c.id) && (
                  <div className="ml-4 mt-2 flex flex-col gap-1">
                    {replies[c.id].map((r: Reply) => (
                      <div key={r.id} className="bg-gray-50 rounded p-1 text-black">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-600">{getUserDisplayName(r.user, r.userDisplayName)}</div>
                          <div className="text-xs text-gray-400 ml-2">{formatDate(r.createdAt)}</div>
                        </div>
                        <div className="text-xs">{r.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-black"
              placeholder="Add a comment..."
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
            />
            <button className="bg-blue-500 text-white rounded px-3 py-2" onClick={handleAddComment}>
              Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, currentUserEmail }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.displayName || "");
  const [bio, setBio] = useState("This is my bio");
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [viewedProfile, setViewedProfile] = useState<User | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(user?.photoURL);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchBio = async () => {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().bio) {
          setBio(userDoc.data().bio);
        }
      }
    };
    fetchBio();
  }, [user?.uid]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (user?.email) {
        const q = query(
          collection(db, "posts"),
          where("user", "==", user.email),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        setPosts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
      }
    };
    fetchPosts();
  }, [user?.email]);

  const handleSave = async () => {
    setError("");
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: name, photoURL: photo });
      } catch (e: unknown) {
        setError("Failed to update name: " + (e instanceof Error ? e.message : 'Unknown error'));
        return;
      }
    }
    if (user?.uid) {
      try {
        await setDoc(doc(db, "users", user.uid), { bio, photoURL: photo, displayName: name }, { merge: true });
      } catch (e: unknown) {
        setError("Failed to update bio: " + (e instanceof Error ? e.message : 'Unknown error'));
        return;
      }
    }
    setEditing(false);
  };

  const handleUploadAvatar = async (file: File) => {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp','image/jpg'].includes(file.type)) {
      setError('Unsupported image type');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image too large (max 8MB)');
      return;
    }
    try {
      setError('');
      setUploadingAvatar(true);
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      setPhoto(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!user) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl text-center">
        <div className="text-gray-500 text-lg">No user data found.</div>
        <button className="mt-4 px-4 py-2 border rounded" onClick={onClose}>Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-white overflow-auto pt-28 pb-10">
      <div className="bg-white rounded-3xl shadow-2xl p-0 w-full max-w-2xl relative border border-gray-100">
        <button
          className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition"
          onClick={onClose}
          aria-label="Close"
        >
          <span className="material-icons" style={{ fontSize: 28 }}>close</span>
        </button>
        <button
          className="sticky top-4 ml-6 text-white hover:text-gray-200 transition bg-blue-600 hover:bg-blue-700 rounded-full p-4 shadow-lg border-2 border-blue-500 z-50 self-start"
          onClick={onClose}
          aria-label="Back"
        >
          <span className="material-icons" style={{ fontSize: 28 }}>arrow_back</span>
        </button>
        <div className="flex flex-col items-center px-8 pt-12 pb-8 bg-gradient-to-b from-white to-gray-50 rounded-t-3xl">
          <img
            alt="User profile"
            className="w-24 h-24 rounded-full mb-2 border-2 border-gray-200 shadow object-cover"
            src={photo || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || "User")}`}
          />
          {currentUserEmail === user.email && (
            <div className="mb-2">
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadAvatar(f);
                }}
              />
              <button
                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 disabled:opacity-50"
                onClick={() => document.getElementById('avatar-input')?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Uploading…' : 'Change Photo'}
              </button>
            </div>
          )}
          {editing ? (
            <input
              className="text-2xl font-semibold text-center w-full mb-1 border-b border-gray-200 bg-transparent focus:outline-none text-black"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          ) : (
            <h1 className="text-2xl font-semibold text-gray-900">{name || user.email}</h1>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {editing ? (
              <input
                className="w-full text-center border-b border-gray-200 bg-transparent focus:outline-none text-black"
                value={bio}
                onChange={e => setBio(e.target.value)}
              />
            ) : (
              bio
            )}
          </p>
          {currentUserEmail !== user.email && (
            <button
              className="mt-4 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700"
              onClick={() => {
                if (user?.email) {
                  onClose();
                  router.push(`/messages/${encodeURIComponent(user.email)}`);
                }
              }}
            >
              Message
            </button>
          )}
          {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
          {currentUserEmail === user.email && (
            <>
              {editing ? (
                <div className="mt-5 flex justify-center gap-3">
                  <button className="px-4 py-1 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={handleSave}>Save</button>
                  <button className="px-4 py-1 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              ) : (
                <button className="mt-5 px-4 py-1 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 transition" onClick={() => setEditing(true)}>
                  Edit Profile
                </button>
              )}
            </>
          )}
        </div>
        <div className="border-t border-gray-100 my-0"></div>
        <div className="px-8 py-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Your Posts</h2>
          {posts.length === 0 ? (
            <div className="text-gray-300 text-center">No posts found.</div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <div
                  key={post.id}
                  className="p-4 rounded-xl bg-white border border-gray-100 flex flex-col items-start shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition"
                  onClick={() => setSelectedPost(post)}
                >
                  <h3 className="font-medium text-gray-900 text-base">{post.title}</h3>
                  <p className="text-gray-500 mt-1 text-sm line-clamp-2">{post.problem}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className={`px-2 py-0.5 rounded-full border ${getCategoryColor(post.category)}`}>{post.category}</span>
                    {post.createdAt && typeof post.createdAt === 'object' && 'seconds' in post.createdAt && (
                      <span>
                        {new Date(post.createdAt.seconds * 1000).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedPost && !viewedProfile && (
          <ProfilePostFullView
            post={selectedPost}
            user={user}
            onClose={() => setSelectedPost(null)}
            onUserClick={async (email: string) => {
              if (email === user?.email) return;
              const q = query(collection(db, "users"), where("email", "==", email));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                setViewedProfile({ 
                  displayName: userData.displayName,
                  email: userData.email,
                  photoURL: userData.photoURL,
                  uid: userDoc.id 
                });
              } else {
                setViewedProfile({ email });
              }
            }}
          />
        )}
        {viewedProfile && (
          <ProfileModal user={viewedProfile} onClose={() => setViewedProfile(null)} />
        )}
      </div>
    </div>
  );
};

export default ProfileModal;