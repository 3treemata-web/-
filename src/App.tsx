import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  WeightEntry,
  MealEntry,
  ExerciseEntry,
  AIAdviceContext,
  MemoEntry,
  ChatMessage,
} from "./types";
import {
  DEFAULT_PROFILE,
  STORAGE_KEYS,
  getCurrentWeekInfo,
  getRecommendedGain,
  getWeekLabel,
  getNextCheckup,
  loadData,
  saveData,
} from "./lib/pregnancyUtils";

// Import modular tabs
import WeightTab from "./components/WeightTab";
import MealTab from "./components/MealTab";
import ExerciseTab from "./components/ExerciseTab";
import AdviceTab from "./components/AdviceTab";
import MemoTab from "./components/MemoTab";
import ChatTab from "./components/ChatTab";

// Import Firebase Auth & Firestore
import { auth, signInWithGoogle, logout, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, getDocs, collection, writeBatch, deleteDoc } from "firebase/firestore";

// Lucide icons
import {
  Heart,
  Scale,
  Coffee,
  Dumbbell,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity,
  CalendarDays,
  Loader2,
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  NotebookPen,
  MessageSquare,
} from "lucide-react";

// Safe Firestore wrappers that integrate with the handleFirestoreError diagnostic system
async function safeGetDoc(docRef: any, path: string) {
  try {
    return await getDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

async function safeGetDocs(queryOrColRef: any, path: string) {
  try {
    return await getDocs(queryOrColRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

async function safeSetDoc(docRef: any, data: any, path: string) {
  try {
    return await setDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

async function safeDeleteDoc(docRef: any, path: string) {
  try {
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

async function safeCommitBatch(batch: any, path: string) {
  try {
    return await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export default function App() {
  // Profiles
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [showSettings, setShowSettings] = useState(false);

  // States
  const [activeTab, setActiveTab] = useState<"weight" | "meal" | "exercise" | "advice" | "memo" | "chat">("weight");
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [memos, setMemos] = useState<MemoEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSending, setChatSending] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(true);

  // Loading & Outputs
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);

  // Edit Settings Inputs
  const [tempPreWeight, setTempPreWeight] = useState("");
  const [tempHeight, setTempHeight] = useState("");
  const [tempLmp, setTempLmp] = useState("");

  // Get formatted today string
  const todayStr = new Date().toISOString().split("T")[0];

  // Auth & Sync handler
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setSyncing(true);
      if (currentUser) {
        try {
          const uid = currentUser.uid;

          // 1. Profile sync
          const profileDocRef = doc(db, "users", uid, "profile", "config");
          const profileSnap = await safeGetDoc(profileDocRef, `users/${uid}/profile/config`);
          let finalProfile = DEFAULT_PROFILE;
          
          if (profileSnap && profileSnap.exists()) {
            finalProfile = profileSnap.data() as typeof DEFAULT_PROFILE;
          } else {
            const localProfile = await loadData(STORAGE_KEYS.profile, DEFAULT_PROFILE);
            await safeSetDoc(profileDocRef, localProfile, `users/${uid}/profile/config`);
            finalProfile = localProfile;
          }
          setProfile(finalProfile);
          setTempPreWeight(finalProfile.prePregnancyWeight.toString());
          setTempHeight(finalProfile.height.toString());
          setTempLmp(finalProfile.lmp);

          // 2. Weights sync
          const weightsColRef = collection(db, "users", uid, "weights");
          const weightsSnap = await safeGetDocs(weightsColRef, `users/${uid}/weights`);
          let finalWeights: WeightEntry[] = [];

          if (weightsSnap && !weightsSnap.empty) {
            finalWeights = weightsSnap.docs.map(doc => doc.data() as WeightEntry);
            finalWeights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          } else {
            const localWeights = await loadData<WeightEntry[]>(STORAGE_KEYS.weights, []);
            if (localWeights.length > 0) {
              const batch = writeBatch(db);
              localWeights.forEach(w => {
                const dRef = doc(db, "users", uid, "weights", w.date);
                batch.set(dRef, w);
              });
              await safeCommitBatch(batch, `users/${uid}/weights [initial batch]`);
            }
            finalWeights = localWeights;
          }

          if (finalWeights.length === 0) {
            const initialWeightLog: WeightEntry = {
              date: finalProfile.lmp,
              weight: finalProfile.prePregnancyWeight,
              weekLabel: "0w0d",
            };
            finalWeights = [initialWeightLog];
            await safeSetDoc(doc(db, "users", uid, "weights", finalProfile.lmp), initialWeightLog, `users/${uid}/weights/${finalProfile.lmp}`);
          }
          setWeights(finalWeights);

          // 3. Meals sync
          const mealsColRef = collection(db, "users", uid, "meals");
          const mealsSnap = await safeGetDocs(mealsColRef, `users/${uid}/meals`);
          let finalMeals: MealEntry[] = [];

          if (mealsSnap && !mealsSnap.empty) {
            finalMeals = mealsSnap.docs.map(doc => doc.data() as MealEntry);
            finalMeals.sort((a, b) => b.id - a.id);
          } else {
            const localMeals = await loadData<MealEntry[]>(STORAGE_KEYS.meals, []);
            if (localMeals.length > 0) {
              const batch = writeBatch(db);
              localMeals.forEach(m => {
                const mRef = doc(db, "users", uid, "meals", m.id.toString());
                batch.set(mRef, m);
              });
              await safeCommitBatch(batch, `users/${uid}/meals [initial batch]`);
            }
            finalMeals = localMeals;
          }
          setMeals(finalMeals);

          // 4. Exercises sync
          const exercisesColRef = collection(db, "users", uid, "exercises");
          const exercisesSnap = await safeGetDocs(exercisesColRef, `users/${uid}/exercises`);
          let finalExercises: ExerciseEntry[] = [];

          if (exercisesSnap && !exercisesSnap.empty) {
            finalExercises = exercisesSnap.docs.map(doc => doc.data() as ExerciseEntry);
            finalExercises.sort((a, b) => b.id - a.id);
          } else {
            const localExercises = await loadData<ExerciseEntry[]>(STORAGE_KEYS.exercises, []);
            if (localExercises.length > 0) {
              const batch = writeBatch(db);
              localExercises.forEach(e => {
                const eRef = doc(db, "users", uid, "exercises", e.id.toString());
                batch.set(eRef, e);
              });
              await safeCommitBatch(batch, `users/${uid}/exercises [initial batch]`);
            }
            finalExercises = localExercises;
          }
          setExercises(finalExercises);

          // 5. Memos sync
          const memosColRef = collection(db, "users", uid, "memos");
          const memosSnap = await safeGetDocs(memosColRef, `users/${uid}/memos`);
          let finalMemos: MemoEntry[] = [];

          if (memosSnap && !memosSnap.empty) {
            finalMemos = memosSnap.docs.map(doc => doc.data() as MemoEntry);
            finalMemos.sort((a, b) => b.id - a.id);
          } else {
            const localMemos = await loadData<MemoEntry[]>(STORAGE_KEYS.memos, []);
            if (localMemos.length > 0) {
              const batch = writeBatch(db);
              localMemos.forEach(memo => {
                const memoRef = doc(db, "users", uid, "memos", memo.id.toString());
                batch.set(memoRef, memo);
              });
              await safeCommitBatch(batch, `users/${uid}/memos [initial batch]`);
            }
            finalMemos = localMemos;
          }
          setMemos(finalMemos);

          // 6. Chats sync
          const chatsColRef = collection(db, "users", uid, "chats");
          const chatsSnap = await safeGetDocs(chatsColRef, `users/${uid}/chats`);
          let finalChats: ChatMessage[] = [];

          if (chatsSnap && !chatsSnap.empty) {
            finalChats = chatsSnap.docs.map(doc => doc.data() as ChatMessage);
            finalChats.sort((a, b) => a.timestamp - b.timestamp);
          } else {
            const localChats = await loadData<ChatMessage[]>(STORAGE_KEYS.chats, []);
            if (localChats.length > 0) {
              const batch = writeBatch(db);
              localChats.forEach(chat => {
                const chatRef = doc(db, "users", uid, "chats", chat.id);
                batch.set(chatRef, chat);
              });
              await safeCommitBatch(batch, `users/${uid}/chats [initial batch]`);
            }
            finalChats = localChats;
          }
          setChatMessages(finalChats);

          // Keep offline fast storage updated as well
          await saveData(STORAGE_KEYS.profile, finalProfile);
          await saveData(STORAGE_KEYS.weights, finalWeights);
          await saveData(STORAGE_KEYS.meals, finalMeals);
          await saveData(STORAGE_KEYS.exercises, finalExercises);
          await saveData(STORAGE_KEYS.memos, finalMemos);
          await saveData(STORAGE_KEYS.chats, finalChats);

        } catch (error) {
          console.error("Error syncing with Firebase:", error);
        } finally {
          setSyncing(false);
          setLoading(false);
        }
      } else {
        // Logged out
        try {
          const savedProfile = await loadData(STORAGE_KEYS.profile, DEFAULT_PROFILE);
          const savedWeights = await loadData<WeightEntry[]>(STORAGE_KEYS.weights, []);
          const savedMeals = await loadData<MealEntry[]>(STORAGE_KEYS.meals, []);
          const savedExercises = await loadData<ExerciseEntry[]>(STORAGE_KEYS.exercises, []);
          const savedMemos = await loadData<MemoEntry[]>(STORAGE_KEYS.memos, []);
          const savedChats = await loadData<ChatMessage[]>(STORAGE_KEYS.chats, []);

          setProfile(savedProfile);
          setTempPreWeight(savedProfile.prePregnancyWeight.toString());
          setTempHeight(savedProfile.height.toString());
          setTempLmp(savedProfile.lmp);

          if (savedWeights.length === 0) {
            const initialWeightLog: WeightEntry = {
              date: savedProfile.lmp,
              weight: savedProfile.prePregnancyWeight,
              weekLabel: "0w0d",
            };
            setWeights([initialWeightLog]);
            await saveData(STORAGE_KEYS.weights, [initialWeightLog]);
          } else {
            setWeights(savedWeights);
          }
          setMeals(savedMeals);
          setExercises(savedExercises);
          setMemos(savedMemos);
          setChatMessages(savedChats);
        } catch (error) {
          console.error("Error loading offline local data:", error);
        } finally {
          setSyncing(false);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Update Profiles settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const lmpVal = tempLmp || DEFAULT_PROFILE.lmp;
    const wtVal = parseFloat(tempPreWeight) || DEFAULT_PROFILE.prePregnancyWeight;
    const htVal = parseFloat(tempHeight) || DEFAULT_PROFILE.height;

    const newProfile = {
      prePregnancyWeight: wtVal,
      height: htVal,
      lmp: lmpVal,
    };

    setProfile(newProfile);
    await saveData(STORAGE_KEYS.profile, newProfile);
    setShowSettings(false);

    // Refresh weight log labels
    const updatedWeights = weights.map(w => ({
      ...w,
      weekLabel: getWeekLabel(w.date, lmpVal),
    }));
    setWeights(updatedWeights);
    await saveData(STORAGE_KEYS.weights, updatedWeights);

    // Sync to Firestore if logged in
    if (user) {
      try {
        const uid = user.uid;
        await safeSetDoc(doc(db, "users", uid, "profile", "config"), newProfile, `users/${uid}/profile/config`);
        
        // Batch write updated weights' labels
        const batch = writeBatch(db);
        updatedWeights.forEach(w => {
          const wRef = doc(db, "users", uid, "weights", w.date);
          batch.set(wRef, w);
        });
        await safeCommitBatch(batch, `users/${uid}/weights [updating labels batch]`);
      } catch (err) {
        console.error("Firestore Profile Save Error:", err);
      }
    }
  };

  // Weight Handlers
  const addWeight = useCallback(async (weightVal: number, dateVal: string) => {
    const weekLabel = getWeekLabel(dateVal, profile.lmp);
    const newEntry: WeightEntry = {
      date: dateVal,
      weight: weightVal,
      weekLabel,
    };

    const updated = [
      ...weights.filter(w => w.date !== dateVal),
      newEntry,
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setWeights(updated);
    await saveData(STORAGE_KEYS.weights, updated);

    // Sync to Firestore
    if (auth.currentUser) {
      try {
        await safeSetDoc(doc(db, "users", auth.currentUser.uid, "weights", dateVal), newEntry, `users/${auth.currentUser.uid}/weights/${dateVal}`);
      } catch (err) {
        console.error("Firestore Weight Add Error:", err);
      }
    }
  }, [weights, profile.lmp]);

  // Meal Handlers
  const addMeal = useCallback(async (time: MealEntry["time"], content: string, dateVal: string, hourMinuteVal?: string) => {
    const newEntry: MealEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: dateVal,
      time,
      content,
      hourMinute: hourMinuteVal,
    };
    const updated = [newEntry, ...meals];
    setMeals(updated);
    await saveData(STORAGE_KEYS.meals, updated);

    // Sync to Firestore
    if (auth.currentUser) {
      try {
        await safeSetDoc(doc(db, "users", auth.currentUser.uid, "meals", newEntry.id.toString()), newEntry, `users/${auth.currentUser.uid}/meals/${newEntry.id}`);
      } catch (err) {
        console.error("Firestore Meal Add Error:", err);
      }
    }
  }, [meals]);

  const deleteMeal = useCallback(async (id: number) => {
    const updated = meals.filter(m => m.id !== id);
    setMeals(updated);
    await saveData(STORAGE_KEYS.meals, updated);

    // Sync to Firestore
    if (auth.currentUser) {
      try {
        await safeDeleteDoc(doc(db, "users", auth.currentUser.uid, "meals", id.toString()), `users/${auth.currentUser.uid}/meals/${id}`);
      } catch (err) {
        console.error("Firestore Meal Delete Error:", err);
      }
    }
  }, [meals]);

  // Exercise Handlers
  const addExercise = useCallback(async (content: string, mins: number, dateVal: string) => {
    const newEntry: ExerciseEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: dateVal,
      content,
      mins,
    };
    const updated = [newEntry, ...exercises];
    setExercises(updated);
    await saveData(STORAGE_KEYS.exercises, updated);

    // Sync to Firestore
    if (auth.currentUser) {
      try {
        await safeSetDoc(doc(db, "users", auth.currentUser.uid, "exercises", newEntry.id.toString()), newEntry, `users/${auth.currentUser.uid}/exercises/${newEntry.id}`);
      } catch (err) {
        console.error("Firestore Exercise Add Error:", err);
      }
    }
  }, [exercises]);

  const deleteExercise = useCallback(async (id: number) => {
    const updated = exercises.filter(e => e.id !== id);
    setExercises(updated);
    await saveData(STORAGE_KEYS.exercises, updated);

    // Sync to Firestore
    if (auth.currentUser) {
      try {
        await safeDeleteDoc(doc(db, "users", auth.currentUser.uid, "exercises", id.toString()), `users/${auth.currentUser.uid}/exercises/${id}`);
      } catch (err) {
        console.error("Firestore Exercise Delete Error:", err);
      }
    }
  }, [exercises]);

  // Memo Handlers
  const addMemo = useCallback(async (content: string, dateVal: string) => {
    const newEntry: MemoEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: dateVal,
      content,
    };
    const updated = [newEntry, ...memos];
    setMemos(updated);
    await saveData(STORAGE_KEYS.memos, updated);

    // Sync to Firestore
    if (auth.currentUser) {
      try {
        await safeSetDoc(doc(db, "users", auth.currentUser.uid, "memos", newEntry.id.toString()), newEntry, `users/${auth.currentUser.uid}/memos/${newEntry.id}`);
      } catch (err) {
        console.error("Firestore Memo Add Error:", err);
      }
    }
  }, [memos]);

  const deleteMemo = useCallback(async (id: number) => {
    const updated = memos.filter(m => m.id !== id);
    setMemos(updated);
    await saveData(STORAGE_KEYS.memos, updated);

    // Sync to Firestore
    if (auth.currentUser) {
      try {
        await safeDeleteDoc(doc(db, "users", auth.currentUser.uid, "memos", id.toString()), `users/${auth.currentUser.uid}/memos/${id}`);
      } catch (err) {
        console.error("Firestore Memo Delete Error:", err);
      }
    }
  }, [memos]);

  // Chat / Consultation Handlers
  const sendChatMessage = useCallback(async (text: string) => {
    if (!text.trim() || chatSending) return;

    // 1. Create User Message
    const userMsg: ChatMessage = {
      id: "u-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      sender: "user",
      text,
      timestamp: Date.now(),
    };

    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    await saveData(STORAGE_KEYS.chats, newMessages);

    // Sync user message to Firestore if logged in
    if (auth.currentUser) {
      try {
        await safeSetDoc(doc(db, "users", auth.currentUser.uid, "chats", userMsg.id), userMsg, `users/${auth.currentUser.uid}/chats/${userMsg.id}`);
      } catch (err) {
        console.error("Firestore User Chat Message Save Error:", err);
      }
    }

    setChatSending(true);

    try {
      // Gather pregnant lady metrics
      const lastWVal = weights[weights.length - 1];
      const curWVal = lastWVal ? lastWVal.weight : profile.prePregnancyWeight;
      const curGVal = parseFloat((curWVal - profile.prePregnancyWeight).toFixed(1));
      const wInfo = getCurrentWeekInfo(profile.lmp);

      // Context summary for chatbot
      const backgroundContext = {
        weekLabel: wInfo.label,
        prePregnancyWeight: profile.prePregnancyWeight,
        currentWeight: curWVal,
        currentGain: curGVal,
        mealsCount: meals.filter(m => m.date === todayStr).length,
        exercisesCount: exercises.filter(e => e.date === todayStr).length,
      };

      // Call Gemini Chat endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: chatMessages.slice(-8), // send last 8 messages for context
          context: backgroundContext,
        }),
      });

      const data = await response.json();
      
      const aiReply = data.reply || "お返事を受け取れませんでした。もう一度送信してみてね 🌸";

      const aiMsg: ChatMessage = {
        id: "ai-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        sender: "ai",
        text: aiReply,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, aiMsg];
      setChatMessages(finalMessages);
      await saveData(STORAGE_KEYS.chats, finalMessages);

      // Sync AI response to Firestore if logged in
      if (auth.currentUser) {
        try {
          await safeSetDoc(doc(db, "users", auth.currentUser.uid, "chats", aiMsg.id), aiMsg, `users/${auth.currentUser.uid}/chats/${aiMsg.id}`);
        } catch (err) {
          console.error("Firestore AI Chat Message Save Error:", err);
        }
      }

    } catch (err) {
      console.error("Chat advise endpoint error:", err);
      
      const errorMsg: ChatMessage = {
        id: "err-" + Date.now(),
        sender: "ai",
        text: "申し訳ありません。通信状態が不安定、またはサーバーが一次的に混み合っているようです。少し時間をおいてから、もう一度お声がけくださいね 🌸",
        timestamp: Date.now(),
      };

      const withError = [...newMessages, errorMsg];
      setChatMessages(withError);
    } finally {
      setChatSending(false);
    }
  }, [chatMessages, chatSending, weights, profile, meals, exercises, todayStr]);

  const resetChatMessageLog = useCallback(async () => {
    setChatMessages([]);
    await saveData(STORAGE_KEYS.chats, []);

    if (auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        const chatsRef = collection(db, "users", uid, "chats");
        const chatsSnap = await safeGetDocs(chatsRef, `users/${uid}/chats`);
        
        if (chatsSnap && !chatsSnap.empty) {
          const batch = writeBatch(db);
          chatsSnap.docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
          });
          await safeCommitBatch(batch, `users/${uid}/chats [resetting chat batch]`);
        }
      } catch (err) {
        console.error("Firestore Chat Reset Error:", err);
      }
    }
  }, []);

  // Get Pregnant Maternal Metrics
  const lastLogged = weights[weights.length - 1];
  const currentWeight = lastLogged ? lastLogged.weight : profile.prePregnancyWeight;
  const currentGain = parseFloat((currentWeight - profile.prePregnancyWeight).toFixed(1));
  const weekInfo = getCurrentWeekInfo(profile.lmp);
  const recGainLimit = getRecommendedGain(weekInfo.weeks);
  const prePregnancyBmi = parseFloat((profile.prePregnancyWeight / ((profile.height / 100) ** 2)).toFixed(1));

  // Checkup Banner metrics
  const nextCheckupItem = getNextCheckup(todayStr);
  const daysToNext = Math.ceil(
    (new Date(nextCheckupItem.date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
  );

  const isOver = currentGain > recGainLimit.max;
  const isUnder = currentGain < recGainLimit.min;
  const isOnTrack = !isOver && !isUnder;

  let statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  let statusText = "順調です";
  let statusEmoji = "✅";

  if (isOver) {
    statusColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
    statusText = "推奨より多めです";
    statusEmoji = "⚠️";
  } else if (isUnder) {
    statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    statusText = "推奨より少なめです";
    statusEmoji = "⏳";
  }

  // AI advises trigger
  const fetchAIAdvice = async () => {
    setAdviceLoading(true);
    setAdvice("");

    const todayMeals = meals.filter(m => m.date === todayStr);
    const todayEx = exercises.filter(e => e.date === todayStr);

    const context: AIAdviceContext = {
      現在週数: weekInfo.label,
      現在体重: currentWeight,
      体重増加量: `+${currentGain}kg`,
      現在の推奨増加範囲: `推奨：+${recGainLimit.min} 〜 +${recGainLimit.max}kg (目安)`,
      次回検診: `目標日: ${nextCheckupItem.date}（${nextCheckupItem.week}）目安：+${nextCheckupItem.minGain}〜+${nextCheckupItem.maxGain}kg`,
      今日の食事: todayMeals.map(m => `【${m.time}】${m.hourMinute ? `${m.hourMinute} ` : ""}${m.content}`),
      今日の運動: todayEx.map(e => `${e.content}（${e.mins}分）`),
    };

    try {
      const response = await fetch("/api/advice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ context }),
      });
      const data = await response.json();
      if (data.advice) {
        setAdvice(data.advice);
      } else if (data.error) {
        setAdvice(`アドバイスを取得できませんでした。理由: ${data.error}${data.details ? ` (${data.details})` : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      setAdvice("サーバーへの接続に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setAdviceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-pink-50/30 text-pink-500 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400 mb-2" />
        <span className="text-xs font-semibold text-pink-450">やさしく読み込んでいます... 🌸</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffafa]/90 pb-12 font-sans text-slate-700">
      {/* Fluffy Pink Cute Header */}
      <div className="bg-gradient-to-br from-pink-400 via-rose-300 to-pink-400 text-white shadow-sm relative overflow-hidden rounded-b-[2rem]">
        <div className="absolute top-0 right-0 opacity-20 pointer-events-none transform translate-x-20 -translate-y-6 w-80 h-80 rounded-full bg-white filter blur-2xl"></div>
        <div className="absolute bottom-0 left-0 opacity-15 pointer-events-none transform -translate-x-12 translate-y-12 w-64 h-64 rounded-full bg-white filter blur-xl"></div>

        <div className="max-w-md mx-auto px-5 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-white/90 rounded-2xl flex items-center justify-center text-xl shadow-md shadow-pink-200">
                🤰
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1">
                  Maternity <span className="text-pink-100 font-medium">Helper</span>
                </h1>
                <p className="text-[10px] text-pink-50 tracking-wider">妊娠中の体重・健康をやさしく追跡 🌸</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 border border-white/25 transition-all text-white hover:scale-105 shadow-sm"
              title="プロフィール設定"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-3 gap-3 bg-white/95 rounded-2xl p-4 border border-pink-100/50 shadow-xl shadow-pink-100/40">
            <div className="text-center">
              <span className="block text-[9px] text-pink-400 uppercase tracking-widest font-bold mb-0.5">現在体重</span>
              <span className="text-base font-extrabold text-slate-800 font-mono">{currentWeight.toFixed(1)}kg</span>
            </div>
            <div className="text-center relative">
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-px h-6 bg-pink-100/60"></div>
              <span className="block text-[9px] text-pink-400 uppercase tracking-widest font-bold mb-0.5">増加量</span>
              <span className="text-base font-extrabold text-pink-500 font-mono">
                +{currentGain.toFixed(1)}kg
              </span>
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-px h-6 bg-pink-100/60"></div>
            </div>
            <div className="text-center">
              <span className="block text-[9px] text-pink-400 uppercase tracking-widest font-bold mb-0.5">現在週数</span>
              <span className="text-xs font-bold text-white bg-gradient-to-r from-pink-400 to-rose-450 px-2 py-0.5 rounded-full inline-block mt-0.5 font-mono shadow-sm shadow-pink-100">
                {weekInfo.label}
              </span>
            </div>
          </div>

          {/* Status Range Ribbon */}
          <div className="mt-3 flex items-center justify-between text-xs py-2 px-3 bg-[#fff5f7]/95 rounded-xl border border-pink-100/60">
            <span className="font-bold flex items-center gap-1.5 text-[10.5px]">
              <span>{statusEmoji}</span>
              <span className="text-pink-600">
                {statusText}
              </span>
            </span>
            <span className="text-[10px] text-pink-400/90 font-medium">
              推奨目安：+{recGainLimit.min} 〜 +{recGainLimit.max}kg
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 mt-5">
        {/* Google Cloud Sync / Authentication Status Banner */}
        <div className="bg-white rounded-3xl p-4 mb-5 border border-pink-100/50 shadow-md shadow-pink-100/20 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-100 flex items-center justify-center text-slate-700 shadow-sm">
                {user ? (
                  <Cloud className="w-4 h-4 text-emerald-500" />
                ) : (
                  <CloudOff className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="text-left">
                {user ? (
                  <>
                    <h5 className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                      <span>クラウド保存中</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    </h5>
                    <p className="text-[9px] text-slate-400 truncate max-w-[180px]" title={user.email || ""}>
                      {user.displayName || "Googleユーザー"} ({user.email})
                    </p>
                  </>
                ) : (
                  <>
                    <h5 className="text-[11px] font-extrabold text-slate-500">
                      データは端末(ローカル)に保存中
                    </h5>
                    <p className="text-[9px] text-slate-400">
                      Googleアカウントでログインするとクラウド同期が有効になります
                    </p>
                  </>
                )}
              </div>
            </div>

            <div>
              {user ? (
                <button
                  onClick={() => logout()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>ログアウト</span>
                </button>
              ) : (
                <button
                  onClick={() => signInWithGoogle()}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-[10px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-pink-500" />
                  <span>ログイン</span>
                </button>
              )}
            </div>
          </div>
          
          {syncing && (
            <div className="mt-2.5 pt-2 border-t border-pink-50/50 text-[9px] text-pink-500 font-bold flex items-center gap-1 animate-pulse justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>データを同期しています...</span>
            </div>
          )}
        </div>

        {/* Settings Collapsible Drawer */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white rounded-2xl p-5 mb-5 shadow-xl shadow-pink-100/30 border border-pink-100/50 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3 border-b border-pink-100/40 pb-2">
                <h4 className="text-xs font-bold text-pink-500 flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5 animate-spin-slow" />
                  妊娠基本プロフィール設定
                </h4>
                <button onClick={() => setShowSettings(false)} className="text-xs text-pink-400 hover:underline">
                  閉じる
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs text-slate-600">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">妊娠前体重 (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tempPreWeight}
                      onChange={e => setTempPreWeight(e.target.value)}
                      className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-200 text-slate-700 font-bold font-mono transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">身長 (cm)</label>
                    <input
                      type="number"
                      value={tempHeight}
                      onChange={e => setTempHeight(e.target.value)}
                      className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-200 text-slate-700 font-bold font-mono transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">最終月経日 (LMP)</label>
                  <input
                    type="date"
                    value={tempLmp}
                    onChange={e => setTempLmp(e.target.value)}
                    className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-200 text-slate-700 font-bold font-mono transition-all"
                  />
                  <p className="text-[10px] text-pink-400 mt-1">
                    （※最終月経日を設定すると週数が自動再計算されます）
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-400 to-rose-400 text-white font-bold py-2.5 rounded-xl hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-pink-200/50"
                >
                  設定を保存
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Checkup Banner */}
        <div className="bg-white rounded-3xl p-4 mb-5 border border-pink-100/50 shadow-md shadow-pink-100/20 relative overflow-hidden flex items-center justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-300/10 blur-2xl rounded-full"></div>
          <div className="flex items-center gap-3 relative z-10">
            <span className="text-xl animate-bounce">📅</span>
            <div>
              <div className="text-xs font-bold text-slate-700">
                次回検診: {nextCheckupItem.date}（{nextCheckupItem.week}）
              </div>
              <div className="text-[10px] text-pink-550 font-bold mt-0.5">
                目標範囲：+{nextCheckupItem.minGain}〜+{nextCheckupItem.maxGain}kg
              </div>
            </div>
          </div>
          <div className="bg-pink-50 border border-pink-200 text-pink-600 font-bold px-3 py-1.5 rounded-2xl text-center text-xs shadow-inner relative z-10 min-w-[85px]">
            <span className="block text-[8px] uppercase font-bold text-pink-400/90 tracking-wider">検診まで</span>
            <span className="font-mono text-pink-600 font-bold">あと {daysToNext} 日</span>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex bg-white rounded-full p-1.5 shadow-md shadow-pink-100/30 border border-pink-100/35 mb-5 relative z-10 select-none">
          {[
            { id: "weight", label: "体重", icon: Scale },
            { id: "meal", label: "食事", icon: Coffee },
            { id: "exercise", label: "運動", icon: Dumbbell },
            { id: "memo", label: "メモ", icon: NotebookPen },
            { id: "advice", label: "分析", icon: Sparkles },
            { id: "chat", label: "相談", icon: MessageSquare },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 text-center rounded-full transition-all relative ${
                  active ? "text-pink-600 font-bold" : "text-slate-400 hover:text-pink-400"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-pink-50/70 rounded-full -z-10 border border-pink-100/30"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 ${active ? "text-pink-500" : "text-slate-400"}`} />
                <span className="text-[9px] tracking-wide font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab View with Fade Animation */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === "weight" && (
                <WeightTab
                  weights={weights}
                  prePregnancyWeight={profile.prePregnancyWeight}
                  onAddWeight={addWeight}
                  nextCheckup={nextCheckupItem}
                  daysToNext={daysToNext}
                  currentGain={currentGain}
                  recGain={recGainLimit}
                  weekInfo={weekInfo}
                  currentWeight={currentWeight}
                />
              )}

              {activeTab === "meal" && (
                <MealTab
                  meals={meals}
                  onAddMeal={addMeal}
                  onDeleteMeal={deleteMeal}
                  today={todayStr}
                />
              )}

              {activeTab === "exercise" && (
                <ExerciseTab
                  exercises={exercises}
                  onAddExercise={addExercise}
                  onDeleteExercise={deleteExercise}
                  today={todayStr}
                />
              )}

              {activeTab === "memo" && (
                <MemoTab
                  memos={memos}
                  onAddMemo={addMemo}
                  onDeleteMemo={deleteMemo}
                  today={todayStr}
                />
              )}

              {activeTab === "advice" && (
                <AdviceTab
                  advice={advice}
                  loading={adviceLoading}
                  onFetchAdvice={fetchAIAdvice}
                  contextData={{
                    現在週数: weekInfo.label,
                    現在体重: currentWeight,
                    体重増加量: `+${currentGain}kg`,
                    現在の推奨増加範囲: `推奨：+${recGainLimit.min} 〜 +${recGainLimit.max}kg (${weekInfo.label}時点)`,
                    次回検診: `${nextCheckupItem.date}（${nextCheckupItem.week}）目標：+${nextCheckupItem.minGain}〜+${nextCheckupItem.maxGain}kg`,
                    今日の食事: meals.filter(m => m.date === todayStr).map(m => `${m.time}${m.hourMinute ? ` (${m.hourMinute})` : ""}: ${m.content}`),
                    今日の運動: exercises.filter(e => e.date === todayStr).map(e => `${e.content}（${e.mins}分）`),
                  }}
                  prePregnancyWeight={profile.prePregnancyWeight}
                  prePregnancyBmi={prePregnancyBmi}
                />
              )}

              {activeTab === "chat" && (
                <ChatTab
                  messages={chatMessages}
                  onSendMessage={sendChatMessage}
                  onResetChat={resetChatMessageLog}
                  loading={chatSending}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
