"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { addDoc, collection, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, getDoc, setDoc, deleteDoc, where, limit, onSnapshot, increment } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { format } from 'date-fns';
import ProfileModal from "../components/ProfileModal";
import { useRouter } from "next/navigation";
import { useSearch } from "../components/SearchContext";
import { db, auth } from "../../lib/firebase";
import { User } from "firebase/auth";

// Type definitions
interface Post {
  id: string;
  title: string;
  problem: string;
  category: string;
  subcategory?: string;
  user: string;
  userPhoto?: string;
  userDisplayName?: string;
  createdAt: { seconds: number } | Date | null;
  upvotes: number;
  downvotes: number;
  comments: number;
  views: number;
  imageUrl?: string;
}

interface Comment {
  id: string;
  text: string;
  user: string;
  userDisplayName?: string;
  createdAt: { seconds: number } | Date | null;
  likes?: number;
}

interface Reply {
  id: string;
  text: string;
  user: string;
  userDisplayName?: string;
  createdAt: { seconds: number } | Date | null;
}

interface Message {
  id: string;
  fromEmail: string;
  fromDisplayName?: string;
  toEmail: string;
  text: string;
  createdAt: { seconds: number } | Date | null;
  read: boolean;
}

// Helper function to get category color
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

// Fisher-Yates shuffle to randomize posts once per fetch
function shuffleArray<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function DashboardPage() {
  const router = useRouter();
  const { searchTerm } = useSearch();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [selectedSidebarCategory, setSelectedSidebarCategory] = useState("all");
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<Post[]>([
    {
      id: "1",
      title: "Difficulty sleeping",
      problem: "I've had trouble falling asleep lately and feel exhausted during the day.",
      category: "mental health",
      user: "user123",
      createdAt: new Date("2023-10-27T10:00:00Z"),
      upvotes: 10,
      downvotes: 2,
      comments: 5,
      views: 0,
    },
    {
      id: "2",
      title: "Arguing with my partner",
      problem: "My partner and I have been having frequent arguments over small things.",
      category: "relationship",
      user: "student142",
      createdAt: new Date("2023-10-27T05:00:00Z"),
      upvotes: 8,
      downvotes: 1,
      comments: 3,
      views: 0,
    },
    {
      id: "3",
      title: "Struggling with assignments",
      problem: "I'm falling behind on my assignments and finding hard to concentrate.",
      category: "school",
      user: "finance",
      createdAt: new Date("2023-10-26T12:00:00Z"),
      upvotes: 5,
      downvotes: 0,
      comments: 1,
      views: 0,
    },
    {
      id: "4",
      title: "Saving money for a vacation",
      problem: "I'm trying to save for a trip but keep getting tempted to spend on other things.",
      category: "finance",
      user: "finance",
      createdAt: new Date("2023-10-26T08:00:00Z"),
      upvotes: 12,
      downvotes: 3,
      comments: 2,
      views: 0,
    },
  ]);
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostAuthorPhoto, setSelectedPostAuthorPhoto] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [likeLoading] = useState(false);
  const [dislikeLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [replies, setReplies] = useState<{[key: string]: Reply[]}>({});
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<{[key: string]: Comment[]}>({});
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(0);
  const [typingIndex, setTypingIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [inbox, setInbox] = useState<Message[]>([]);
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
  const [uploadingPostImage, setUploadingPostImage] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [viewedPostIds, setViewedPostIds] = useState<Set<string>>(new Set());
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [userCommentCount, setUserCommentCount] = useState(0);
  const [canPost, setCanPost] = useState(false);
  
  const placeholderTexts = useMemo(() => [
    "Search for solutions...",
    "Find community support...",
    "Discover helpful advice...",
    "Connect with others...",
    "Share your experience..."
  ], []);

  // Animate placeholder text with typing effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedPlaceholder((prev) => (prev + 1) % placeholderTexts.length);
      setTypingIndex(0);
      setIsTyping(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [placeholderTexts.length]);

  // Typing animation effect
  useEffect(() => {
    if (!isTyping) return;
    
    const currentText = placeholderTexts[animatedPlaceholder];
    if (typingIndex < currentText.length) {
      const timeout = setTimeout(() => {
        setTypingIndex(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      // Wait a bit before starting to type the next word
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [typingIndex, isTyping, animatedPlaceholder, placeholderTexts]);



  const maskEmail = (email?: string) => {
    if (!email) return "User";
    const [local, domain] = email.split("@");
    if (!local || !domain) return "User";
    return `${local.slice(0, 2)}***@${domain}`;
  };

  // Helper function to display user name instead of email for privacy
  const getUserDisplayName = (userEmail: string, userDisplayName?: string) => {
    // If it's the current user, show their email
    if (user && userEmail === user.email) {
      return userDisplayName || userEmail;
    }
    // For other users, show display name or a masked version of email
    if (userDisplayName) {
      return userDisplayName;
    }
    // Mask the email for privacy (show first 2 chars + @ + domain)
    const [localPart, domain] = userEmail.split('@');
    if (localPart && domain) {
      return `${localPart.substring(0, 2)}***@${domain}`;
    }
    return 'Anonymous User';
  };

  // Check user's comment count on different posts
  const checkUserCommentRequirement = useCallback(async () => {
    if (!user?.email) {
      setUserCommentCount(0);
      setCanPost(false);
      return;
    }

    try {
      const uniquePostsCommented = new Set();

      // Get all posts
      const postsQuery = query(collection(db, "posts"));
      const postsSnapshot = await getDocs(postsQuery);
      
      for (const postDoc of postsSnapshot.docs) {
        // Skip user's own posts
        if (postDoc.data().user === user.email) continue;
        
        // Check if current user has commented on this post
        const userCommentsQuery = query(
          collection(db, "posts", postDoc.id, "comments"),
          where("user", "==", user.email)
        );
        const userCommentsSnapshot = await getDocs(userCommentsQuery);
        
        if (userCommentsSnapshot.size > 0) {
          uniquePostsCommented.add(postDoc.id);
        }
      }

      setUserCommentCount(uniquePostsCommented.size);
      setCanPost(uniquePostsCommented.size >= 3);
    } catch (error) {
      console.error("Error checking comment requirement:", error);
      setUserCommentCount(0);
      setCanPost(false);
    }
  }, [user?.email]);

  const [viewedProfile, setViewedProfile] = useState<null | { displayName?: string; email?: string; photoURL?: string; uid?: string }>(null);
  

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Check comment requirement when user changes
  useEffect(() => {
    checkUserCommentRequirement();
  }, [user, checkUserCommentRequirement]);

  // Subscribe to saved posts for current user
  useEffect(() => {
    if (!user?.uid) { setSavedPostIds(new Set()); return; }
    const colRef = collection(db, "users", user.uid, "savedPosts");
    const unsub = onSnapshot(colRef, (snap) => {
      const ids = new Set<string>();
      snap.forEach((d) => ids.add(d.id));
      setSavedPostIds(ids);
    });
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to viewed posts for current user
  useEffect(() => {
    if (!user?.uid) { setViewedPostIds(new Set()); return; }
    const colRef = collection(db, "users", user.uid, "viewedPosts");
    const unsub = onSnapshot(colRef, (snap) => {
      const ids = new Set<string>();
      snap.forEach((d) => ids.add(d.id));
      setViewedPostIds(ids);
    });
    return () => unsub();
  }, [user?.uid]);

  // Fetch posts from Firestore
  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const loadedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      
      // Fetch comment counts for each post
      const postsWithComments = await Promise.all(
        loadedPosts.map(async (post) => {
          const commentsQuery = query(collection(db, "posts", post.id, "comments"));
          const commentsSnapshot = await getDocs(commentsQuery);
          return {
            ...post,
            comments: commentsSnapshot.size
          };
        })
      );
      
      // Randomize order so each load shows different recommendations
      setPosts(shuffleArray(postsWithComments as Post[]));
    };
    fetchPosts();
  }, []);

  // Filter posts based on search and selectedSidebarCategory
  const filteredPosts = posts.filter(post => {
    // Special filter for unanswered posts
    if (selectedSidebarCategory === "unanswered") {
      if ((post.comments || 0) !== 0) return false;
    }
    // Saved filter
    if (selectedSidebarCategory === "saved") {
      if (!savedPostIds.has(post.id)) return false;
    }
    if (
      selectedSidebarCategory &&
      selectedSidebarCategory !== "home" &&
      selectedSidebarCategory !== "all" &&
      selectedSidebarCategory !== "unanswered" &&
      selectedSidebarCategory !== "saved" &&
      selectedSidebarCategory !== "trending"
    ) {
      if (post.category?.toLowerCase() !== selectedSidebarCategory.toLowerCase()) return false;
    }
    if (!searchTerm.trim()) return true;
    const s = searchTerm.trim().toLowerCase();
    return (
      post.title?.toLowerCase().includes(s) ||
      post.problem?.toLowerCase().includes(s)
    );
  });

  // When Trending is selected, sort by views descending
  const displayedPosts = selectedSidebarCategory === "trending"
    ? [...filteredPosts].sort((a, b) => (b.views || 0) - (a.views || 0))
    : filteredPosts;

  // Fetch comments for selected post
  useEffect(() => {
    if (selectedPost) {
      const fetchComments = async () => {
        const q = query(collection(db, "posts", selectedPost.id, "comments"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        setComments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
      };
      fetchComments();
    } else {
      setComments([]);
    }
  }, [selectedPost]);

  // Fetch replies for comments
  useEffect(() => {
    async function fetchReplies() {
      if (!selectedPost || !comments.length) return;
      const allReplies = {};
      for (const comment of comments) {
        const q = query(collection(db, "posts", selectedPost.id, "comments", comment.id, "replies"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        (allReplies as {[key: string]: Reply[]})[comment.id] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reply));
      }
      setReplies(allReplies);
    }
    fetchReplies();
  }, [selectedPost, comments]);

  // Fetch user's vote for selected post
  useEffect(() => {
    async function fetchUserVote() {
      if (!selectedPost || !user) {
        setUserVote(null);
        return;
      }
      const voteDocRef = doc(db, "posts", selectedPost.id, "votes", user.uid);
      const voteSnap = await getDoc(voteDocRef);
      if (voteSnap.exists()) {
        setUserVote(voteSnap.data().type);
      } else {
        setUserVote(null);
      }
    }
    fetchUserVote();
  }, [selectedPost, user]);

  // Fetch comments for post cards
  const fetchPostComments = async (postId: string) => {
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"), limit(3));
    const querySnapshot = await getDocs(q);
    const comments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
    setPostComments(prev => ({ ...prev, [postId]: comments }));
  };

  // Toggle comments for a post
  const toggleComments = (postId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      // Fetch comments when expanding
      fetchPostComments(postId);
    }
    setExpandedComments(newExpanded);
  };

  const handleAuth = async () => {
    setAuthError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthModalOpen(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : 'An error occurred');
    }
  };

  const handleForgotPassword = async () => {
    setForgotPasswordError("");
    setForgotPasswordSuccess(false);
    if (!forgotPasswordEmail) {
      setForgotPasswordError("Please enter your email address");
      return;
    }
    try {
      setForgotPasswordLoading(true);
      const actionCodeSettings = {
        url: `${window.location.origin}/`,
        handleCodeInApp: false,
      } as const;
      await sendPasswordResetEmail(auth, forgotPasswordEmail, actionCodeSettings);
      setForgotPasswordSuccess(true);
      setForgotPasswordError("");
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      let message = e instanceof Error ? e.message : 'An unknown error occurred';
      if (code === 'auth/invalid-email') message = 'Invalid email address.';
      if (code === 'auth/user-not-found') message = 'No account found with this email.';
      if (code === 'auth/too-many-requests') message = 'Too many attempts. Please try again later.';
      if (code === 'auth/network-request-failed') message = 'Network error. Check your connection and try again.';
      setForgotPasswordError(message);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handlePost = async () => {
    if (!title || !problem || !category) return;
    setPosting(true);
    const newPost = {
      title,
      problem,
      category,
      subcategory, // add subcategory
      user: user?.email || "user",
      userPhoto: user?.photoURL || "",
      userDisplayName: user?.displayName || "",
      createdAt: serverTimestamp(),
      upvotes: 0,
      downvotes: 0,
      comments: 0,
      views: 0,
      imageUrl: postImageUrl || null,
    };
    try {
      await addDoc(collection(db, "posts"), newPost);
      setModalOpen(false);
      setTitle("");
      setProblem("");
      setCategory("");
      setSubcategory("");
      setPostImageUrl(null);
      // Fetch posts again
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const loadedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(shuffleArray(loadedPosts));
    } catch {
      alert("Error posting problem");
    }
    setPosting(false);
  };

  const handleUploadPostImage = async (file: File) => {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp','image/jpg'].includes(file.type)) {
      alert('Unsupported image type');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('Image too large (max 8MB)');
      return;
    }
    try {
      setUploadingPostImage(true);
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      setPostImageUrl(url);
    } catch (e: unknown) {
      alert(`Upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setUploadingPostImage(false);
    }
  };

  const toggleSavePost = async (postId: string) => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid, "savedPosts", postId);
    try {
      if (savedPostIds.has(postId)) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, { postId, createdAt: serverTimestamp() });
      }
    } catch (e) {
      console.error('toggle save error', e);
      alert('Failed to toggle save');
    }
  };

  const openAuthorProfile = async (email: string) => {
    if (!email || email === user?.email) return;
    const qUsers = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(qUsers);
    if (!snap.empty) {
      const userDoc = snap.docs[0];
      setViewedProfile({ ...userDoc.data(), uid: userDoc.id });
    } else {
      setViewedProfile({ email });
    }
  };

  // Track post view
  const trackPostView = async (postId: string) => {
    if (!user?.uid) return;
    // Add to user's viewed posts
    const userViewedRef = doc(db, "users", user.uid, "viewedPosts", postId);
    setDoc(userViewedRef, { postId, viewedAt: serverTimestamp() });
    
    // Increment post view count
    const postRef = doc(db, "posts", postId);
    updateDoc(postRef, {
      views: increment(1)
    });

    // Update local posts state immediately
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, views: (post.views || 0) + 1 }
          : post
      )
    );

    // Update selectedPost if it's the same post
    setSelectedPost(prev => 
      prev && prev.id === postId 
        ? { ...prev, views: (prev.views || 0) + 1 }
        : prev
    );
  };

  const handleOpenFullView = (post: Post) => {
    setSelectedPost(post);
    setFullViewOpen(true);
    // Track view when opening post
    if (user?.uid && !viewedPostIds.has(post.id)) {
      trackPostView(post.id);
    }
    // Fetch author profile photo for accurate avatar
    (async () => {
      try {
        const qUser = query(collection(db, "users"), where("email", "==", post.user));
        const snap = await getDocs(qUser);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setSelectedPostAuthorPhoto(data.photoURL || null);
          if (data.displayName && (!post.userDisplayName || post.userDisplayName !== data.displayName)) {
            setSelectedPost((prev) => (prev ? { ...prev, userDisplayName: data.displayName } : prev));
          }
        } else {
          setSelectedPostAuthorPhoto(null);
        }
      } catch {
        setSelectedPostAuthorPhoto(null);
      }
    })();
  };
  const handleCloseFullView = () => {
    setFullViewOpen(false);
    setSelectedPost(null);
    setCommentInput("");
  };

  const handleVote = async (type: 'like' | 'dislike') => {
    if (!selectedPost || !user) return;
    const voteDocRef = doc(db, "posts", selectedPost.id, "votes", user.uid);
    const postDocRef = doc(db, "posts", selectedPost.id);
    const voteSnap = await getDoc(voteDocRef);
    let newUpvotes = selectedPost.upvotes || 0;
    let newDownvotes = selectedPost.downvotes || 0;
    if (!voteSnap.exists()) {
      // No vote yet, add new
      await setDoc(voteDocRef, { type });
      if (type === 'like') newUpvotes++;
      else newDownvotes++;
    } else if (voteSnap.data().type === type) {
      // Same vote, remove
      await deleteDoc(voteDocRef);
      if (type === 'like') newUpvotes--;
      else newDownvotes--;
    } else {
      // Switch vote
      await setDoc(voteDocRef, { type });
      if (type === 'like') { newUpvotes++; newDownvotes--; }
      else { newDownvotes++; newUpvotes--; }
    }
    await updateDoc(postDocRef, { upvotes: newUpvotes, downvotes: newDownvotes });
    setSelectedPost({ ...selectedPost, upvotes: newUpvotes, downvotes: newDownvotes });
    setUserVote((prev) => (prev === type ? null : type));
  };

  // Handle like/dislike from post card
  const handleCardVote = async (postId: string, type: 'like' | 'dislike') => {
    if (!user) return;
    const voteDocRef = doc(db, "posts", postId, "votes", user.uid);
    const postDocRef = doc(db, "posts", postId);
    const voteSnap = await getDoc(voteDocRef);
    
    // Find the post in the current posts array
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const currentPost = posts[postIndex];
    let newUpvotes = currentPost.upvotes || 0;
    let newDownvotes = currentPost.downvotes || 0;
    
    if (!voteSnap.exists()) {
      // No vote yet, add new
      await setDoc(voteDocRef, { type });
      if (type === 'like') newUpvotes++;
      else newDownvotes++;
    } else if (voteSnap.data().type === type) {
      // Same vote, remove
      await deleteDoc(voteDocRef);
      if (type === 'like') newUpvotes--;
      else newDownvotes--;
    } else {
      // Switch vote
      await setDoc(voteDocRef, { type });
      if (type === 'like') { newUpvotes++; newDownvotes--; }
      else { newDownvotes++; newUpvotes--; }
    }
    
    // Update the post in Firestore
    await updateDoc(postDocRef, { upvotes: newUpvotes, downvotes: newDownvotes });
    
    // Update the posts state immediately
    const updatedPosts = [...posts];
    updatedPosts[postIndex] = { ...currentPost, upvotes: newUpvotes, downvotes: newDownvotes };
    setPosts(updatedPosts);
  };

  // Handle add comment and update post comment count
  const handleAddCommentAndUpdate = async () => {
    if (!selectedPost || !commentInput.trim()) return;
    const comment = {
      text: commentInput,
      user: user?.email || "user",
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "posts", selectedPost.id, "comments"), comment);
    setCommentInput("");
    
    // Update the post's comment count immediately
    const postIndex = posts.findIndex(p => p.id === selectedPost.id);
    if (postIndex !== -1) {
      const updatedPosts = [...posts];
      updatedPosts[postIndex] = { 
        ...updatedPosts[postIndex], 
        comments: (updatedPosts[postIndex].comments || 0) + 1 
      };
      setPosts(updatedPosts);
      
      // Also update the selectedPost state for the modal
      setSelectedPost(prev => prev ? { ...prev, comments: (prev.comments || 0) + 1 } : null);
    }
    
    // Refresh comments
    const q = query(collection(db, "posts", selectedPost.id, "comments"), orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    setComments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    
    // Check comment requirement after adding comment
    checkUserCommentRequirement();
  };

  const handleLikeComment = async (commentId: string) => {
    if (!selectedPost) return;
    const commentDocRef = doc(db, "posts", selectedPost.id, "comments", commentId);
    await updateDoc(commentDocRef, {
      likes: (comments.find(c => c.id === commentId)?.likes || 0) + 1,
    });
    // Refresh comments
    const q = query(collection(db, "posts", selectedPost.id, "comments"), orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    setComments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
  };

  const handleAddReply = async (commentId: string) => {
    if (!selectedPost || !replyInput.trim()) return;
    const reply = {
      text: replyInput,
      user: user?.email || "user",
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "posts", selectedPost.id, "comments", commentId, "replies"), reply);
    setReplyInput("");
    setReplyingTo(null);
    // Refresh comments (and replies)
    const q = query(collection(db, "posts", selectedPost.id, "comments"), orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    setComments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
  };

  // Add delete handler
  const handleDeletePost = async () => {
    if (!selectedPost) return;
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    const postDocRef = doc(db, "posts", selectedPost.id);
    await deleteDoc(postDocRef);
    setFullViewOpen(false);
    setSelectedPost(null);
    // Refresh posts
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    setPosts(shuffleArray(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post))));
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPost || !user) return;
    
    // Find the comment to check if user owns it
    const comment = comments.find(c => c.id === commentId);
    if (!comment || comment.user !== user.email) return;
    
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    
    try {
      // Delete the comment from Firestore
      await deleteDoc(doc(db, "posts", selectedPost.id, "comments", commentId));
      
      // Update the post's comment count
      const postIndex = posts.findIndex(p => p.id === selectedPost.id);
      if (postIndex !== -1) {
        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { 
          ...updatedPosts[postIndex], 
          comments: Math.max(0, (updatedPosts[postIndex].comments || 0) - 1) 
        };
        setPosts(updatedPosts);
        
        // Also update the selectedPost state for the modal
        setSelectedPost(prev => prev ? { 
          ...prev, 
          comments: Math.max(0, (prev.comments || 0) - 1) 
        } : null);
      }
      
      // Refresh comments
      const q = query(collection(db, "posts", selectedPost.id, "comments"), orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      setComments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    }
  };

  // Helper to format Firestore timestamp or JS Date
  function formatDate(date: { seconds: number } | Date | null | undefined) {
    if (!date) return '';
    if (typeof date === 'object' && date !== null && 'seconds' in date) {
      // Firestore Timestamp
      return format(new Date(date.seconds * 1000), 'PPpp');
    }
    if (date instanceof Date) {
      return format(date, 'PPpp');
    }
    return String(date);
  }

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setInbox([]);
      return;
    }
    const qUnread = query(collection(db, "messages"), where("toEmail", "==", user.email), where("read", "==", false));
    const qInbox = query(collection(db, "messages"), where("toEmail", "==", user.email), limit(50));

    const unsubUnread = onSnapshot(qUnread, (snap) => {
      setUnreadCount(snap.size);
    });
    const unsubInbox = onSnapshot(qInbox, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      items.sort((a, b) => {
        const aTs = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? a.createdAt.seconds : 0;
        const bTs = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? b.createdAt.seconds : 0;
        return bTs - aTs;
      });
      setInbox(items);
    }, (err) => {
      console.error('Inbox snapshot error', err);
    });
    return () => { unsubUnread(); unsubInbox(); };
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col relative bg-white">
      
      <div className="relative z-10">
      <header className="bg-white shadow-sm sticky top-0 z-10 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div />
            {/* Search and notifications moved to global top bar */}
            <div className="flex-1" />
          </div>
        </div>
      </header>
      <div className="flex-1 flex">
        <aside className="w-64 bg-white p-6 hidden md:block sticky top-20 h-screen overflow-y-auto">
          <nav className="space-y-4">
            <a
              className={`text-gray-900 ${!selectedSidebarCategory || selectedSidebarCategory === "home" ? "bg-gray-100" : ""} group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer`}
              onClick={() => setSelectedSidebarCategory("home")}
            >
              <span className="material-icons mr-3">home</span>
              Home
            </a>
            <a
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${selectedSidebarCategory === "trending" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
              onClick={() => setSelectedSidebarCategory("trending")}
            >
              <span className="material-icons mr-3">trending_up</span>
              Trending
            </a>
            <a
              className={`text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${selectedSidebarCategory === "unanswered" ? "bg-gray-100 text-gray-900" : ""}`}
              onClick={() => setSelectedSidebarCategory("unanswered")}
              title="Unanswered (0 comments)"
            >
              <span className="material-icons mr-3">hourglass_empty</span>
              Unanswered
              <span className="ml-auto bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                Help needed!
              </span>
            </a>
            <a
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer relative"
              onClick={() => setMessagesOpen((v) => !v)}
              title="Messages"
            >
              <span className="material-icons mr-3">mail</span>
              Messages
              {unreadCount > 0 && (
                <span className="absolute right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow">{unreadCount}</span>
              )}
            </a>
            <a
              className={`text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${selectedSidebarCategory === "saved" ? "bg-gray-100 text-gray-900" : ""}`}
              onClick={() => setSelectedSidebarCategory("saved")}
              title="Saved posts"
            >
              <span className="material-icons mr-3">bookmark</span>
              Saved
            </a>
            <div className="pt-4">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" id="categories-headline">
                Categories
              </h3>
              <div aria-labelledby="categories-headline" className="mt-2 space-y-1" role="group">
                {/* All button at the top of categories */}
                <a
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${selectedSidebarCategory === "all" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
                  onClick={() => setSelectedSidebarCategory("all")}
                >
                  <span className="w-2.5 h-2.5 mr-4 bg-gray-400 rounded-full"></span>
                  <span className="truncate">All</span>
                </a>
                {[
                  { name: "Mental Health", color: "bg-blue-500", value: "mental health" },
                  { name: "Relationship", color: "bg-pink-500", value: "relationship" },
                  { name: "School", color: "bg-yellow-500", value: "school" },
                  { name: "Finance", color: "bg-green-500", value: "finance" },
                  { name: "Health", color: "bg-teal-500", value: "health" },
                  { name: "Career", color: "bg-purple-500", value: "career" },
                  { name: "Family", color: "bg-orange-500", value: "family" },
                  { name: "Personal Growth", color: "bg-indigo-500", value: "personal growth" },
                  { name: "Technology", color: "bg-gray-500", value: "technology" },
                  { name: "Other", color: "bg-gray-400", value: "other" },
                ].map(cat => (
                  <a
                    key={cat.value}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${selectedSidebarCategory === cat.value ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
                    onClick={() => setSelectedSidebarCategory(cat.value)}
                  >
                    <span className={`w-2.5 h-2.5 mr-4 ${cat.color} rounded-full`}></span>
                    <span className="truncate">{cat.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </nav>
        </aside>
        <main className="flex-1 p-6">
          {!user && (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="text-black text-lg font-semibold mb-2">Sign in to post and view problems</div>
              <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => setAuthModalOpen(true)}>Sign In / Sign Up</button>
            </div>
          )}
          {user && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {displayedPosts.map((post) => {
                const isActive = selectedPost && selectedPost.id === post.id && fullViewOpen;
                return (
                  <div
                    key={post.id}
                    className={`transition-all duration-300 bg-white p-5 rounded-xl shadow-sm cursor-pointer group
                      ${isActive ? 'border-2 border-blue-500 ring-2 ring-blue-200 shadow-md' : 'border-2 border-black'}
                      hover:border-blue-400 hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 hover:scale-[1.02]`}
                    onClick={() => handleOpenFullView(post)}
                  >
                  <h2 className="text-lg font-bold text-black mb-1 group-hover:text-blue-600 transition-colors duration-300">{post.title}</h2>
                  <p className="mt-1 text-black text-sm group-hover:text-gray-700 transition-colors duration-300">{post.problem}</p>
                  {post.imageUrl && (
                    <a href={post.imageUrl} target="_blank" rel="noreferrer" className="block mt-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.imageUrl} alt="attachment" className="w-full max-h-64 object-cover rounded-lg border border-gray-200" />
                    </a>
                  )}
                  <div className="mt-3">
                      <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border transition-all duration-300 group-hover:scale-105 group-hover:shadow-sm ${getCategoryColor(post.category)}`}>
                        {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                      </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{getUserDisplayName(post.user, post.userDisplayName)} • {formatDate(post.createdAt)}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        className={`flex items-center ${savedPostIds.has(post.id) ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-600 transition-all duration-200 hover:scale-110`}
                        title={savedPostIds.has(post.id) ? 'Unsave' : 'Save'}
                        onClick={(e) => { e.stopPropagation(); toggleSavePost(post.id); }}
                      >
                        {savedPostIds.has(post.id) ? (
                          <span className="material-icons text-base mr-1">bookmark</span>
                        ) : (
                          <span className="material-symbols-outlined text-base mr-1">bookmark</span>
                        )}
                      </button>
                      <button 
                        className="flex items-center text-gray-400 hover:text-blue-600 transition-all duration-200 hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardVote(post.id, 'like');
                        }}
                      >
                        <span className="material-symbols-outlined text-base mr-1">thumb_up</span>
                        <span>{post.upvotes || 0}</span>
                      </button>
                      <button 
                        className="flex items-center text-gray-400 hover:text-red-600 transition-all duration-200 hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardVote(post.id, 'dislike');
                        }}
                      >
                        <span className="material-symbols-outlined text-base mr-1">thumb_down</span>
                        <span>{post.downvotes || 0}</span>
                      </button>
                      <button 
                        className="flex items-center text-gray-400 hover:text-gray-700 transition-all duration-200 hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComments(post.id);
                        }}
                      >
                        <span className="material-symbols-outlined text-base mr-1">chat_bubble</span>
                        <span>{post.comments || 0}</span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 font-medium">
                    <span>{post.views || 0} views</span>
                  </div>
                  {/* Comments section */}
                  {expandedComments.has(post.id) && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {postComments[post.id] && postComments[post.id].length > 0 ? (
                          postComments[post.id].map((comment) => (
                            <div key={comment.id} className="bg-gray-50 rounded p-2 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-700">{getUserDisplayName(comment.user, comment.userDisplayName)}</span>
                                <span className="text-gray-400">{formatDate(comment.createdAt)}</span>
                              </div>
                              <p className="text-gray-600">{comment.text}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-xs text-center py-2">No comments yet</div>
                        )}
                      </div>
                      {(post.comments || 0) > 3 && (
                        <button 
                          className="text-blue-500 text-xs mt-2 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFullView(post);
                          }}
                        >
                          View all {post.comments} comments
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Messages Dropdown */}
          {messagesOpen && (
            <div className="fixed top-20 left-64 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              <div className="p-3 border-b text-sm font-semibold text-gray-700">Messages</div>
              <div className="max-h-80 overflow-y-auto">
                {inbox.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400">No messages</div>
                ) : (
                  inbox.map((msg: Message) => (
                    <div
                      key={msg.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer text-sm border-b"
                      onClick={async () => {
                        await updateDoc(doc(db, "messages", msg.id), { read: true });
                        const otherEmail = msg.fromEmail === user?.email ? msg.toEmail : msg.fromEmail;
                        if (otherEmail) {
                          setMessagesOpen(false);
                          router.push(`/messages/${encodeURIComponent(otherEmail as string)}`);
                        }
                      }}
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">{msg.fromDisplayName || maskEmail(msg.fromEmail)}</div>
                          <div className="text-gray-600 mt-0.5 line-clamp-2">{msg.text}</div>
                        </div>
                        {!msg.read && <span className="ml-2 mt-1 w-2 h-2 bg-blue-500 rounded-full" />}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        {(() => {
                          const ts = msg.createdAt;
                          const d = ts && typeof ts === 'object' && 'seconds' in ts ? new Date(ts.seconds * 1000) : ts instanceof Date ? ts : null;
                          return d ? d.toLocaleString() : '';
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {/* Full View Modal */}
          {fullViewOpen && selectedPost && (
            <div className="fixed inset-0 z-50 bg-white flex flex-col w-screen h-screen overflow-y-auto">
              {/* Back Button - positioned below top bar */}
              <button
                className="fixed top-24 left-6 flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 rounded-full px-4 py-2 shadow-lg transition z-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Back to dashboard"
                onClick={handleCloseFullView}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Back</span>
              </button>
              <button className="absolute top-4 right-6 text-gray-400 hover:text-gray-700 z-10" onClick={handleCloseFullView}>
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
              {user && selectedPost.user === user.email && (
                <button
                  className="absolute top-4 right-32 flex items-center gap-2 text-red-500 bg-white bg-opacity-80 rounded-full px-4 py-2 shadow hover:bg-red-100 hover:text-red-700 transition z-20 border border-red-200"
                  onClick={handleDeletePost}
                >
                  <span className="material-symbols-outlined text-2xl">delete</span>
                  <span className="font-medium text-base">Delete</span>
                </button>
              )}
              <div className="flex flex-col flex-1 justify-center items-center w-full h-full pt-16 pb-8 px-4">
                <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-200 p-12 mx-auto text-lg">
                  <div
                    className="flex flex-col items-center mb-6 mt-40 relative z-20 cursor-pointer"
                    onClick={() => openAuthorProfile(selectedPost.user)}
                  >
                    <img
                      src={selectedPostAuthorPhoto || selectedPost.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPost.userDisplayName || selectedPost.user)}&background=E5E7EB&color=111827`}
                      alt={selectedPost.userDisplayName || selectedPost.user}
                      className="w-16 h-16 rounded-full ring-2 ring-gray-200 shadow-md mb-2 cursor-pointer bg-white pointer-events-auto"
                      onClick={(e) => { e.stopPropagation(); openAuthorProfile(selectedPost.user); }}
                    />
                    <span
                      className="text-base font-semibold text-gray-800 hover:underline cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); openAuthorProfile(selectedPost.user); }}
                    >
                      {selectedPost.userDisplayName || selectedPost.user}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-black">{selectedPost.title}</h2>
                  <p className="mb-2 text-black">{selectedPost.problem}</p>
                  {selectedPost.imageUrl && (
                    <div className="my-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedPost.imageUrl}
                        alt="attachment"
                        className="w-full max-h-[480px] object-contain rounded-xl border border-gray-200"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="mb-4">
                    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${getCategoryColor(selectedPost.category)}`}>
                      {selectedPost.category.charAt(0).toUpperCase() + selectedPost.category.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mb-4">
                    <button className={`flex items-center ${userVote === 'like' ? 'text-blue-600 font-bold' : 'text-gray-600'} hover:text-blue-600`} onClick={() => handleVote('like')} disabled={likeLoading}>
                      <span className="material-symbols-outlined mr-1">thumb_up</span> {selectedPost.upvotes || 0}
                    </button>
                    <button className={`flex items-center ${userVote === 'dislike' ? 'text-red-600 font-bold' : 'text-gray-600'} hover:text-red-600`} onClick={() => handleVote('dislike')} disabled={dislikeLoading}>
                      <span className="material-symbols-outlined mr-1">thumb_down</span> {selectedPost.downvotes || 0}
                    </button>
                    <div className="flex items-center text-gray-600">
                      <span className="text-base font-medium">{selectedPost.views || 0} views</span>
                    </div>
                  </div>
                  <div className="mb-2 font-semibold text-black">Comments</div>
                  <div className="flex flex-col gap-2 mb-4 max-h-40 overflow-y-auto">
                    {comments.length === 0 && <div className="text-gray-400 text-sm">No comments yet.</div>}
                    {comments.map((c) => (
                      <div key={c.id} className="bg-gray-100 rounded p-2 text-black">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-600 mb-1">{getUserDisplayName(c.user, c.userDisplayName)}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-400">{formatDate(c.createdAt)}</div>
                            {/* Three dots menu - only show for user's own comments */}
                            {user && c.user === user.email && (
                              <div className="relative">
                                <button
                                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Toggle dropdown or show delete option
                                    if (window.confirm("Delete this comment?")) {
                                      handleDeleteComment(c.id);
                                    }
                                  }}
                                >
                                  <span className="material-icons text-sm">more_vert</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-sm mb-1">{c.text}</div>
                        <div className="flex items-center gap-3 text-xs">
                          <button className="flex items-center text-gray-500 hover:text-blue-600" onClick={() => handleLikeComment(c.id)}>
                            <span className="material-symbols-outlined text-base mr-1">thumb_up</span> {c.likes || 0}
                          </button>
                          <button className="flex items-center text-gray-500 hover:text-blue-600" onClick={() => setReplyingTo(c.id)}>
                            <span className="material-symbols-outlined text-base mr-1">reply</span> Reply
                          </button>
                          {/* Show Replies button - only if there are replies */}
                          {replies[c.id] && replies[c.id].length > 0 && (
                            <button 
                              className="flex items-center text-gray-500 hover:text-blue-600" 
                              onClick={() => {
                                const newExpanded = new Set(expandedReplies);
                                if (newExpanded.has(c.id)) {
                                  newExpanded.delete(c.id);
                                } else {
                                  newExpanded.add(c.id);
                                }
                                setExpandedReplies(newExpanded);
                              }}
                            >
                              <span className="material-symbols-outlined text-base mr-1">expand_more</span> 
                              {expandedReplies.has(c.id) ? 'Hide Replies' : `Show Replies (${replies[c.id].length})`}
                            </button>
                          )}
                        </div>
                        {/* Reply input */}
                        {replyingTo === c.id && (
                          <div className="flex gap-2 mt-2">
                            <input className="flex-1 border border-gray-300 rounded px-2 py-1 text-black text-xs" placeholder="Write a reply..." value={replyInput} onChange={e => setReplyInput(e.target.value)} />
                            <button className="bg-blue-500 text-white rounded px-2 py-1 text-xs" onClick={() => handleAddReply(c.id)}>Reply</button>
                          </div>
                        )}
                        {/* Replies - only show when expanded */}
                        {replies[c.id] && replies[c.id].length > 0 && expandedReplies.has(c.id) && (
                          <div className="ml-4 mt-2 flex flex-col gap-1">
                            {replies[c.id].map((r) => (
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
                    <input className="flex-1 border border-gray-300 rounded px-3 py-2 text-black" placeholder="Add a comment..." value={commentInput} onChange={e => setCommentInput(e.target.value)} />
                    <button className="bg-blue-500 text-white rounded px-3 py-2" onClick={handleAddCommentAndUpdate}>Comment</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <div className="fixed bottom-6 right-6">
        {user && (
          <div className="flex flex-col items-end gap-2">
            {!canPost && (
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-lg text-sm max-w-xs">
                <div className="font-semibold">Posting Requirement</div>
                <div>Comment on {3 - userCommentCount} more unanswered problems to post</div>
                <div className="text-xs mt-1">Progress: {userCommentCount}/3</div>
              </div>
            )}
            <button 
              className={`font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out ${
                canPost 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`} 
              onClick={() => canPost && setModalOpen(true)}
              disabled={!canPost}
            >
              {canPost ? 'Post Problem' : 'Requirement Not Met'}
            </button>
          </div>
        )}
        {/* Auth Modal */}
        {authModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-white/40">
            <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg flex flex-col gap-3">
              <h2 className="text-lg font-bold mb-2 text-black">{isLogin ? "Sign In" : "Sign Up"}</h2>
              <input className="w-full border border-gray-300 rounded px-3 py-2 text-black" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} type="email" />
              <input className="w-full border border-gray-300 rounded px-3 py-2 text-black" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} type="password" />
              {isLogin && (
                <button 
                  className="text-xs text-blue-600 hover:text-blue-800 text-left self-start" 
                  onClick={() => {
                    setForgotPasswordEmail(authEmail);
                    setForgotPasswordModalOpen(true);
                    setAuthModalOpen(false);
                  }}
                >
                  Forgot Password?
                </button>
              )}
              {authError && <div className="text-red-500 text-xs">{authError}</div>}
              <button className="bg-blue-500 text-white rounded px-3 py-2 mt-2" onClick={handleAuth}>{isLogin ? "Sign In" : "Sign Up"}</button>
              <button className="text-xs text-gray-500 mt-1" onClick={() => setIsLogin(!isLogin)}>{isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}</button>
              <button className="text-xs text-gray-400 mt-1" onClick={() => setAuthModalOpen(false)}>Cancel</button>
            </div>
          </div>
        )}
        {/* Forgot Password Modal */}
        {forgotPasswordModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-white/40">
            <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg flex flex-col gap-3">
              <h2 className="text-lg font-bold mb-2 text-black">Reset Password</h2>
              <p className="text-sm text-gray-600 mb-3">Enter your email address and we&apos;ll send you a link to reset your password.</p>
              <input 
                className="w-full border border-gray-300 rounded px-3 py-2 text-black" 
                placeholder="Email" 
                value={forgotPasswordEmail} 
                onChange={e => setForgotPasswordEmail(e.target.value)} 
                type="email" 
              />
              {forgotPasswordError && <div className="text-red-500 text-xs">{forgotPasswordError}</div>}
              {forgotPasswordSuccess && (
                <div className="text-green-600 text-xs bg-green-50 p-2 rounded">
                  Password reset email sent! Check your inbox.
                </div>
              )}
              <button 
                className={`rounded px-3 py-2 mt-2 text-white ${forgotPasswordLoading ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'}`} 
                onClick={handleForgotPassword}
                disabled={forgotPasswordSuccess || forgotPasswordLoading}
              >
                {forgotPasswordLoading ? 'Sending...' : (forgotPasswordSuccess ? 'Email Sent!' : 'Send Reset Email')}
              </button>
              <button 
                className="text-xs text-gray-500 mt-1" 
                onClick={() => {
                  setForgotPasswordModalOpen(false);
                  setForgotPasswordEmail("");
                  setForgotPasswordError("");
                  setForgotPasswordSuccess(false);
                  setAuthModalOpen(true);
                }}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}
        {/* Post Modal */}
        {modalOpen && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-6 border border-gray-100 relative">
              <button
                className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                disabled={posting}
              >
                <span className="material-icons" style={{ fontSize: 28 }}>close</span>
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Post a Problem</h2>
              {!canPost && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons text-yellow-600">info</span>
                    <span className="font-semibold text-yellow-800">Posting Requirement</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    You need to comment on {3 - userCommentCount} more unanswered problems before you can post.
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    Progress: {userCommentCount}/3 comments on unanswered posts
                  </div>
                </div>
              )}
              <input
                className="w-full border-0 border-b border-gray-200 rounded-none px-0 py-3 text-lg text-gray-900 bg-transparent focus:ring-0 focus:border-blue-400 placeholder-gray-400"
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={posting}
              />
              <textarea
                className="w-full border-0 border-b border-gray-200 rounded-none px-0 py-3 text-base text-gray-800 bg-transparent focus:ring-0 focus:border-blue-400 placeholder-gray-400 resize-none"
                placeholder="Describe your problem..."
                value={problem}
                onChange={e => setProblem(e.target.value)}
                rows={3}
                disabled={posting}
              />
              {/* Image upload */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  onClick={() => document.getElementById('post-image-input')?.click()}
                  disabled={posting || uploadingPostImage}
                >
                  <span className="material-icons">attach_file</span>
                  {uploadingPostImage ? 'Uploading...' : 'Add image'}
                </button>
                <input
                  id="post-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadPostImage(f);
                  }}
                />
                {postImageUrl && (
                  <a href={postImageUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline">Preview image</a>
                )}
              </div>
              <select
                className="w-full border-0 border-b border-gray-200 rounded-none px-0 py-3 text-base text-gray-800 bg-transparent focus:ring-0 focus:border-blue-400"
                value={category}
                onChange={e => { setCategory(e.target.value); setSubcategory(''); }}
                disabled={posting}
              >
                <option value="">Select category</option>
                <option value="mental health">Mental Health</option>
                <option value="relationship">Relationship</option>
                <option value="school">School</option>
                <option value="finance">Finance</option>
                <option value="health">Health</option>
                <option value="career">Career</option>
                <option value="family">Family</option>
                <option value="personal growth">Personal Growth</option>
                <option value="technology">Technology</option>
                <option value="other">Other</option>
              </select>
              {/* Subcategory dropdown */}
              {category && (
                <select
                  className="w-full border-0 border-b border-gray-200 rounded-none px-0 py-3 text-base text-gray-800 bg-transparent focus:ring-0 focus:border-blue-400"
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                  disabled={posting}
                >
                  <option value="">Select subcategory</option>
                  {category === 'mental health' && (
                    <>
                      <option value="anxiety">Anxiety</option>
                      <option value="depression">Depression</option>
                      <option value="stress">Stress</option>
                      <option value="sleep">Sleep</option>
                      <option value="other">Other</option>
                    </>
                  )}
                  {category === 'relationship' && (
                    <>
                      <option value="family">Family</option>
                      <option value="friends">Friends</option>
                      <option value="romantic">Romantic</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </>
                  )}
                  {category === 'school' && (
                    <>
                      <option value="assignments">Assignments</option>
                      <option value="exams">Exams</option>
                      <option value="peer pressure">Peer Pressure</option>
                      <option value="other">Other</option>
                    </>
                  )}
                  {category === 'finance' && (
                    <>
                      <option value="saving">Saving</option>
                      <option value="spending">Spending</option>
                      <option value="investing">Investing</option>
                      <option value="debt">Debt</option>
                      <option value="other">Other</option>
                    </>
                  )}
                  {category === 'health' && (
                    <>
                      <option value="physical">Physical</option>
                      <option value="nutrition">Nutrition</option>
                      <option value="exercise">Exercise</option>
                      <option value="illness">Illness</option>
                      <option value="other">Other</option>
                    </>
                  )}
                  {category === 'career' && (
                    <>
                      <option value="job search">Job Search</option>
                      <option value="promotion">Promotion</option>
                      <option value="work-life balance">Work-Life Balance</option>
                      <option value="other">Other</option>
                    </>
                  )}
                  {category === 'family' && (
                    <>
                      <option value="parenting">Parenting</option>
                      <option value="siblings">Siblings</option>
                      <option value="marriage">Marriage</option>
                      <option value="other">Other</option>
                    </>
                  )}
                  {category === 'personal growth' && (
                    <>
                      <option value="motivation">Motivation</option>
                      <option value="habits">Habits</option>
                      <option value="goals">Goals</option>
                      <option value="other">Other</option>
                    </>
                  )}
                  {category === 'technology' && (
                    <>
                      <option value="devices">Devices</option>
                      <option value="software">Software</option>
                      <option value="social media">Social Media</option>
                      <option value="other">Other</option>
                    </>
                  )}
                  {category === 'other' && (
                    <>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
              )}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
                  onClick={() => setModalOpen(false)}
                  disabled={posting}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 rounded-full font-semibold shadow transition ${
                    canPost && !posting && title && problem && category
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  onClick={handlePost}
                  disabled={posting || !title || !problem || !category || !canPost}
                >
                  {posting ? "Posting..." : canPost ? "Post" : "Requirement Not Met"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {viewedProfile && (
        <ProfileModal user={viewedProfile} onClose={() => setViewedProfile(null)} showBackButton={true} currentUserEmail={user?.email || undefined} />
      )}
      </div>
    </div>
  );
}