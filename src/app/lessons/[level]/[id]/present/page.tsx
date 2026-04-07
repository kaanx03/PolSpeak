"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchLessonContentById } from "@/lib/supabase-helpers";
import { supabase } from "@/lib/supabase";
import PdfViewer from "@/components/PdfViewer";
import WaveformPlayer from "@/components/WaveformPlayer";

interface AudioItem {
  id: string;
  audioUrl: string;
  audioName: string;
  title: string;
}

interface ImageItem {
  id: string;
  imageUrl: string;
  imageName: string;
  caption: string;
  orientation?: "landscape" | "portrait";
}

interface TrueFalseStatement {
  id: string;
  statement: string;
  isTrue: boolean;
}

interface ImageChoiceItem {
  id: string;
  imageUrl: string;
  imageName: string;
  correctOption: string;
  options: string[];
}

interface InlineChoiceSentence {
  id: string;
  text: string;
  blanks: {
    correctAnswer: string;
    options: string[];
  }[];
}

interface Module {
  id: string;
  type: "fillblank" | "pdf" | "image" | "quiz" | "text" | "audio" | "matching" | "wordwall" | "miro" | "quizlet" | "genially" | "baamboozle" | "truefalse" | "imagechoice" | "inlinechoice" | "youtube" | "vocabulary" | "iframe" | "section";
  content: any;
}

// Helper function to render inline formatting (bold, italic, underline)
const formatInline = (text: string) => {
  if (!text) return null;
  return text.split(/(\*\*.*?\*\*|\*[^*]+\*|__.*?__)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return <u key={i}>{part.slice(2, -2)}</u>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
};

// Helper to render text with markdown headings and inline formatting
const formatText = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### ")) {
      return <h3 key={i} className="text-xl font-bold text-slate-800 mt-4 mb-1">{formatInline(line.slice(4))}</h3>;
    }
    if (line.startsWith("## ")) {
      return <h2 key={i} className="text-2xl font-bold text-slate-800 mt-5 mb-2">{formatInline(line.slice(3))}</h2>;
    }
    if (line.startsWith("# ")) {
      return <h1 key={i} className="text-3xl font-bold text-slate-800 mt-6 mb-3">{formatInline(line.slice(2))}</h1>;
    }
    if (line === "") {
      return <br key={i} />;
    }
    return <p key={i} className="text-lg text-slate-700 leading-relaxed">{formatInline(line)}</p>;
  });
};

export default function PresentationPage() {
  const params = useParams();
  const router = useRouter();
  const [lessonTitle, setLessonTitle] = useState("Loading...");
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const moduleRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Live session state
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; initials: string }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const liveChannelRef = useRef<any>(null);
  const suppressBroadcastRef = useRef(false);
  // Refs for cleanup (state not accessible in unmount closure)
  const liveSessionIdRef = useRef<string | null>(null);
  const userRoleRef = useRef<'teacher' | 'student' | null>(null);
  const [studentAnswersLive, setStudentAnswersLive] = useState<{ [studentId: string]: { name: string; answers: { [key: string]: any } } }>({});
  const [studentInfo, setStudentInfo] = useState<{ id: string; name: string } | null>(null);

  // Load lesson from Supabase
  useEffect(() => {
    loadLesson();
  }, [params.level, params.id]);

  const loadLesson = async () => {
    const lessonData = await fetchLessonContentById(params.id as string);
    if (lessonData) {
      setLessonTitle(lessonData.title || "Untitled Lesson");
      setModules(lessonData.modules || []);
    } else {
      setLessonTitle("Lesson not found");
    }
  };

  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({});
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});

  // Audio management
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  // Matching game state - per module
  const [matchingStates, setMatchingStates] = useState<{ [moduleId: string]: {
    selectedLeft: number | null;
    selectedRight: number | null;
    matchedPairs: Set<string>;
    shuffledLeftItems: any[];
    shuffledRightItems: any[];
  }}>({});

  // True/False state - per module
  const [trueFalseStates, setTrueFalseStates] = useState<{ [moduleId: string]: {
    answers: { [statementId: string]: boolean | null };
    showResults: boolean;
  }}>({});

  // Track scroll position to update active module
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const containerHeight = contentRef.current.clientHeight;

      // Find which module is most visible
      let activeIndex = 0;
      let minDistance = Infinity;

      moduleRefs.current.forEach((ref, index) => {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const containerRect = contentRef.current!.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top;
          const distance = Math.abs(relativeTop - containerHeight * 0.3);

          if (distance < minDistance) {
            minDistance = distance;
            activeIndex = index;
          }
        }
      });

      setActiveModuleIndex(activeIndex);
    };

    const container = contentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [modules]);

  // Initialize matching game state for each matching module
  useEffect(() => {
    modules.forEach((module) => {
      if (module.type === "matching" && module.content.pairs && !matchingStates[module.id]) {
        const leftItems = module.content.pairs.map((pair: any, index: number) => ({
          text: pair.left,
          image: pair.leftImage,
          originalIndex: index,
          id: `left-${index}`,
        }));
        const shuffledLeft = [...leftItems].sort(() => Math.random() - 0.5);

        const rightItems = module.content.pairs.map((pair: any, index: number) => ({
          text: pair.right,
          image: pair.rightImage,
          originalIndex: index,
          id: `right-${index}`,
        }));
        const shuffledRight = [...rightItems].sort(() => Math.random() - 0.5);

        setMatchingStates(prev => ({
          ...prev,
          [module.id]: {
            selectedLeft: null,
            selectedRight: null,
            matchedPairs: new Set(),
            shuffledLeftItems: shuffledLeft,
            shuffledRightItems: shuffledRight,
          }
        }));
      }
    });
  }, [modules]);

  const handleMatchingClick = (moduleId: string, side: "left" | "right", item: any, displayIndex: number, pairs: any[]) => {
    const state = matchingStates[moduleId];
    if (!state) return;

    const pairId = `${item.originalIndex}`;
    if (state.matchedPairs.has(pairId)) return;

    if (side === "left") {
      if (state.selectedLeft === displayIndex) {
        setMatchingStates(prev => ({
          ...prev,
          [moduleId]: { ...prev[moduleId], selectedLeft: null }
        }));
      } else {
        const newState = { ...state, selectedLeft: displayIndex };
        if (state.selectedRight !== null) {
          const rightItem = state.shuffledRightItems[state.selectedRight];
          checkMatch(moduleId, item, rightItem, newState);
        } else {
          setMatchingStates(prev => ({ ...prev, [moduleId]: newState }));
        }
      }
    } else {
      if (state.selectedRight === displayIndex) {
        setMatchingStates(prev => ({
          ...prev,
          [moduleId]: { ...prev[moduleId], selectedRight: null }
        }));
      } else {
        const newState = { ...state, selectedRight: displayIndex };
        if (state.selectedLeft !== null) {
          const leftItem = state.shuffledLeftItems[state.selectedLeft];
          checkMatch(moduleId, leftItem, item, newState);
        } else {
          setMatchingStates(prev => ({ ...prev, [moduleId]: newState }));
        }
      }
    }
  };

  const checkMatch = (moduleId: string, leftItem: any, rightItem: any, currentState: any) => {
    if (leftItem.originalIndex === rightItem.originalIndex) {
      const newMatched = new Set(currentState.matchedPairs);
      newMatched.add(`${leftItem.originalIndex}`);
      setMatchingStates(prev => ({
        ...prev,
        [moduleId]: {
          ...currentState,
          matchedPairs: newMatched,
          selectedLeft: null,
          selectedRight: null,
        }
      }));
      broadcastInteraction({ kind: 'matching_match', moduleId, originalIndex: leftItem.originalIndex });
    } else {
      setMatchingStates(prev => ({ ...prev, [moduleId]: currentState }));
      setTimeout(() => {
        setMatchingStates(prev => ({
          ...prev,
          [moduleId]: { ...prev[moduleId], selectedLeft: null, selectedRight: null }
        }));
      }, 800);
    }
  };

  const handleAnswerChange = (moduleId: string, value: any, isQuiz: boolean) => {
    setUserAnswers(prev => ({ ...prev, [moduleId]: value }));
    if (isQuiz) {
      setShowAnswers(prev => ({ ...prev, [moduleId]: true }));
    }
    broadcastInteraction({ kind: 'quiz', key: moduleId, value, moduleId });
  };

  const toggleAnswer = (moduleId: string) => {
    setShowAnswers(prev => {
      const next = !prev[moduleId];
      broadcastInteraction({ kind: 'show_answers', moduleId, value: next });
      return { ...prev, [moduleId]: next };
    });
  };

  const broadcastInteraction = (payload: Record<string, any>) => {
    if (isLive && liveChannelRef.current && !suppressBroadcastRef.current) {
      liveChannelRef.current.send({
        type: 'broadcast',
        event: 'student_interaction',
        payload: { studentId: studentInfo?.id, studentName: studentInfo?.name, ...payload },
      });
    }
  };

  const toggleAudio = (audioUrl: string) => {
    // If clicking the same audio that's currently loaded
    if (currentAudioRef.current && currentAudioUrl === audioUrl) {
      if (isAudioPlaying) {
        currentAudioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        currentAudioRef.current.play();
        setIsAudioPlaying(true);
      }
      return;
    }

    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Reset progress
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);

    // Create new audio and play
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    setCurrentAudioUrl(audioUrl);
    setIsAudioPlaying(true);

    audio.onloadedmetadata = () => { setAudioDuration(audio.duration); };
    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime);
      if (audio.duration) setAudioProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.onended = () => {
      setIsAudioPlaying(false);
      setAudioProgress(0);
      setAudioCurrentTime(0);
    };

    audio.play();
  };

  const seekAudio = (audioUrl: string, percent: number) => {
    if (currentAudioRef.current && currentAudioUrl === audioUrl) {
      const newTime = (percent / 100) * audioDuration;
      currentAudioRef.current.currentTime = newTime;
      setAudioCurrentTime(newTime);
      setAudioProgress(percent);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const scrollToModule = (index: number) => {
    const ref = moduleRefs.current[index];
    if (ref && contentRef.current) {
      const containerTop = contentRef.current.getBoundingClientRect().top;
      const elemTop = ref.getBoundingClientRect().top;
      const target = contentRef.current.scrollTop + (elemTop - containerTop);
      contentRef.current.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }
  };

  // Auth init + live session detection
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const role = session.user.user_metadata?.role;
      const isStudent = role === 'student';
      const resolvedRole = isStudent ? 'student' : 'teacher';
      setUserRole(resolvedRole);
      userRoleRef.current = resolvedRole;

      if (isStudent) {
        const { data: student } = await supabase
          .from('students')
          .select('id, name')
          .eq('user_id', session.user.id)
          .single();
        if (student) setStudentInfo(student);

        const sessionId = new URLSearchParams(window.location.search).get('session');
        if (sessionId) {
          setLiveSessionId(sessionId);
          liveSessionIdRef.current = sessionId;
          setIsLive(true);
          subscribeAsStudent(sessionId);
        }
      } else {
        // Fetch students list
        const { data: students } = await supabase
          .from('students')
          .select('id, name, initials')
          .eq('status', 'active')
          .order('name');
        if (students) setAllStudents(students);

        // Restore active session if teacher refreshed mid-session
        const { data: activeSession } = await supabase
          .from('live_sessions')
          .select('id')
          .eq('lesson_id', params.id as string)
          .eq('active', true)
          .maybeSingle();
        if (activeSession) {
          setLiveSessionId(activeSession.id);
          liveSessionIdRef.current = activeSession.id;
          setIsLive(true);
          subscribeAsTeacher(activeSession.id);
        }
      }
    };
    init();
    return () => {
      // Clean up channel
      if (liveChannelRef.current) supabase.removeChannel(liveChannelRef.current);
      // If teacher leaves page while live, deactivate session in DB
      if (userRoleRef.current === 'teacher' && liveSessionIdRef.current) {
        supabase.from('live_sessions').delete().eq('id', liveSessionIdRef.current);
      }
    };
  }, []);


  const subscribeAsTeacher = (sessionId: string) => {
    const channel = supabase.channel(`live:${sessionId}`)
      .on('broadcast', { event: 'student_interaction' }, ({ payload }) => {
        suppressBroadcastRef.current = true;
        const { kind, studentId, studentName } = payload;

        if (kind === 'fill_blank' || kind === 'quiz') {
          setUserAnswers(prev => ({ ...prev, [payload.key]: payload.value }));
          setStudentAnswersLive(prev => ({
            ...prev,
            [studentId]: {
              name: studentName,
              answers: { ...(prev[studentId]?.answers || {}), [payload.key]: payload.value },
            },
          }));
        } else if (kind === 'truefalse') {
          setTrueFalseStates(prev => ({
            ...prev,
            [payload.moduleId]: {
              ...prev[payload.moduleId] || { showResults: false },
              answers: { ...(prev[payload.moduleId]?.answers || {}), [payload.statementId]: payload.value },
            },
          }));
        } else if (kind === 'imagechoice') {
          setImageChoiceStates(prev => ({
            ...prev,
            [payload.moduleId]: {
              ...prev[payload.moduleId] || { shuffledOptions: {}, showResults: false },
              selections: { ...(prev[payload.moduleId]?.selections || {}), [payload.itemId]: payload.value },
            },
          }));
        } else if (kind === 'inlinechoice') {
          setInlineChoiceStates(prev => ({
            ...prev,
            [payload.moduleId]: {
              ...prev[payload.moduleId] || { shuffledOptions: {}, showResults: false },
              selections: {
                ...(prev[payload.moduleId]?.selections || {}),
                [payload.sentenceId]: {
                  ...(prev[payload.moduleId]?.selections?.[payload.sentenceId] || {}),
                  [payload.blankIndex]: payload.value,
                },
              },
            },
          }));
        } else if (kind === 'matching_match') {
          setMatchingStates(prev => {
            const mod = prev[payload.moduleId];
            if (!mod) return prev;
            const newMatched = new Set(mod.matchedPairs);
            newMatched.add(`${payload.originalIndex}`);
            return { ...prev, [payload.moduleId]: { ...mod, matchedPairs: newMatched, selectedLeft: null, selectedRight: null } };
          });
        } else if (kind === 'show_answers') {
          setShowAnswers(prev => ({ ...prev, [payload.moduleId]: payload.value }));
        } else if (kind === 'show_results') {
          if (payload.stateType === 'truefalse') {
            setTrueFalseStates(prev => ({
              ...prev,
              [payload.moduleId]: { ...prev[payload.moduleId] || { answers: {} }, showResults: payload.value },
            }));
          } else if (payload.stateType === 'imagechoice') {
            setImageChoiceStates(prev => ({
              ...prev,
              [payload.moduleId]: { ...prev[payload.moduleId] || { selections: {}, shuffledOptions: {} }, showResults: payload.value },
            }));
          } else if (payload.stateType === 'inlinechoice') {
            setInlineChoiceStates(prev => ({
              ...prev,
              [payload.moduleId]: { ...prev[payload.moduleId] || { selections: {}, shuffledOptions: {} }, showResults: payload.value },
            }));
          }
        }
        setTimeout(() => { suppressBroadcastRef.current = false; }, 100);
      })
      .subscribe();
    liveChannelRef.current = channel;
  };

  const subscribeAsStudent = (sessionId: string) => {
    const channel = supabase.channel(`live:${sessionId}`)
      .on('broadcast', { event: 'student_interaction' }, ({ payload }) => {
        suppressBroadcastRef.current = true;
        const { kind } = payload;
        if (kind === 'fill_blank' || kind === 'quiz') {
          setUserAnswers(prev => ({ ...prev, [payload.key]: payload.value }));
        } else if (kind === 'truefalse') {
          setTrueFalseStates(prev => ({
            ...prev,
            [payload.moduleId]: {
              ...prev[payload.moduleId] || { showResults: false },
              answers: { ...(prev[payload.moduleId]?.answers || {}), [payload.statementId]: payload.value },
            },
          }));
        } else if (kind === 'imagechoice') {
          setImageChoiceStates(prev => ({
            ...prev,
            [payload.moduleId]: {
              ...prev[payload.moduleId] || { shuffledOptions: {}, showResults: false },
              selections: { ...(prev[payload.moduleId]?.selections || {}), [payload.itemId]: payload.value },
            },
          }));
        } else if (kind === 'inlinechoice') {
          setInlineChoiceStates(prev => ({
            ...prev,
            [payload.moduleId]: {
              ...prev[payload.moduleId] || { shuffledOptions: {}, showResults: false },
              selections: {
                ...(prev[payload.moduleId]?.selections || {}),
                [payload.sentenceId]: {
                  ...(prev[payload.moduleId]?.selections?.[payload.sentenceId] || {}),
                  [payload.blankIndex]: payload.value,
                },
              },
            },
          }));
        } else if (kind === 'matching_match') {
          setMatchingStates(prev => {
            const mod = prev[payload.moduleId];
            if (!mod) return prev;
            const newMatched = new Set(mod.matchedPairs);
            newMatched.add(`${payload.originalIndex}`);
            return { ...prev, [payload.moduleId]: { ...mod, matchedPairs: newMatched, selectedLeft: null, selectedRight: null } };
          });
        } else if (kind === 'show_answers') {
          setShowAnswers(prev => ({ ...prev, [payload.moduleId]: payload.value }));
        } else if (kind === 'show_results') {
          if (payload.stateType === 'truefalse') {
            setTrueFalseStates(prev => ({
              ...prev,
              [payload.moduleId]: { ...prev[payload.moduleId] || { answers: {} }, showResults: payload.value },
            }));
          } else if (payload.stateType === 'imagechoice') {
            setImageChoiceStates(prev => ({
              ...prev,
              [payload.moduleId]: { ...prev[payload.moduleId] || { selections: {}, shuffledOptions: {} }, showResults: payload.value },
            }));
          } else if (payload.stateType === 'inlinechoice') {
            setInlineChoiceStates(prev => ({
              ...prev,
              [payload.moduleId]: { ...prev[payload.moduleId] || { selections: {}, shuffledOptions: {} }, showResults: payload.value },
            }));
          }
        }
        setTimeout(() => { suppressBroadcastRef.current = false; }, 100);
      })
      .on('broadcast', { event: 'session_end' }, () => {
        setIsLive(false);
        setLiveSessionId(null);
        if (liveChannelRef.current) {
          supabase.removeChannel(liveChannelRef.current);
          liveChannelRef.current = null;
        }
        router.push('/student');
      })
      .subscribe();
    liveChannelRef.current = channel;
  };

  const startLiveSession = async () => {
    if (selectedStudentIds.length === 0) return;
    const { data } = await supabase
      .from('live_sessions')
      .insert({
        lesson_id: params.id as string,
        lesson_title: lessonTitle,
        invited_student_ids: selectedStudentIds,
        active: true,
      })
      .select()
      .single();
    if (data) {
      setLiveSessionId(data.id);
      liveSessionIdRef.current = data.id;
      setIsLive(true);
      setIsGoLiveOpen(false);
      setSelectedStudentIds([]);
      subscribeAsTeacher(data.id);
    }
  };

  const endLiveSession = async () => {
    const sessionId = liveSessionIdRef.current;
    if (!sessionId) return;

    // 1. Delete session from DB
    await supabase.from('live_sessions').delete().eq('id', sessionId);

    // 2. Broadcast session_end then remove channel after short delay
    if (liveChannelRef.current) {
      liveChannelRef.current.send({ type: 'broadcast', event: 'session_end', payload: {} });
      setTimeout(() => {
        if (liveChannelRef.current) {
          supabase.removeChannel(liveChannelRef.current);
          liveChannelRef.current = null;
        }
      }, 500);
    }

    // 3. Reset state
    liveSessionIdRef.current = null;
    setIsLive(false);
    setLiveSessionId(null);
    setStudentAnswersLive({});
  };

  // Image Choice state - per module
  const [imageChoiceStates, setImageChoiceStates] = useState<{ [moduleId: string]: {
    selections: { [itemId: string]: string };
    shuffledOptions: { [itemId: string]: string[] };
    showResults: boolean;
  }}>({});

  // Initialize shuffled options for image choice modules
  useEffect(() => {
    modules.forEach((module) => {
      if (module.type === "imagechoice" && module.content.imageChoiceItems && !imageChoiceStates[module.id]?.shuffledOptions) {
        const shuffledOptions: { [itemId: string]: string[] } = {};
        module.content.imageChoiceItems.forEach((item: ImageChoiceItem) => {
          const allOptions = [item.correctOption, ...item.options].filter(o => o);
          shuffledOptions[item.id] = [...allOptions].sort(() => Math.random() - 0.5);
        });
        setImageChoiceStates(prev => ({
          ...prev,
          [module.id]: {
            selections: prev[module.id]?.selections || {},
            shuffledOptions,
            showResults: prev[module.id]?.showResults || false
          }
        }));
      }
    });
  }, [modules]);

  // Inline Choice state - per module
  const [inlineChoiceStates, setInlineChoiceStates] = useState<{ [moduleId: string]: {
    selections: { [sentenceId: string]: { [blankIndex: number]: string } };
    shuffledOptions: { [sentenceId: string]: { [blankIndex: number]: string[] } };
    showResults: boolean;
  }}>({});

  // Image lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Initialize shuffled options for inline choice modules
  useEffect(() => {
    modules.forEach((module) => {
      if (module.type === "inlinechoice" && module.content.inlineChoiceSentences && !inlineChoiceStates[module.id]?.shuffledOptions) {
        const shuffledOptions: { [sentenceId: string]: { [blankIndex: number]: string[] } } = {};
        module.content.inlineChoiceSentences.forEach((sentence: InlineChoiceSentence) => {
          shuffledOptions[sentence.id] = {};
          sentence.blanks.forEach((blank, blankIndex) => {
            const allOptions = [blank.correctAnswer, ...blank.options].filter(o => o);
            shuffledOptions[sentence.id][blankIndex] = [...allOptions].sort(() => Math.random() - 0.5);
          });
        });
        setInlineChoiceStates(prev => ({
          ...prev,
          [module.id]: {
            selections: prev[module.id]?.selections || {},
            shuffledOptions,
            showResults: prev[module.id]?.showResults || false
          }
        }));
      }
    });
  }, [modules]);

  const getModuleTypeName = (type: string) => {
    const names: { [key: string]: string } = {
      fillblank: "Fill in the blanks",
      text: "Text",
      quiz: "Choose the answer",
      truefalse: "True or False",
      imagechoice: "Choose the word",
      inlinechoice: "Choose the correct word",
      image: "Image",
      pdf: "PDF Document",
      audio: "Audio",
      matching: "Match the pairs",
      wordwall: "Wordwall",
      baamboozle: "Baamboozle",
      quizlet: "Quizlet",
      genially: "Genially",
      miro: "Miro Board",
      iframe: "Link",
      youtube: "YouTube Video",
      vocabulary: "Vocabulary Cards",
      section: "Section Header",
    };
    return names[type] || type;
  };

  // Compute sections from section-type modules
  const sections = modules.reduce<{ title: string; moduleIndex: number }[]>((acc, module, index) => {
    if (module.type === "section") {
      acc.push({ title: module.content?.title || "Section", moduleIndex: index });
    }
    return acc;
  }, []);

  const activeSectionIndex = sections.reduce((active, section, i) => {
    if (section.moduleIndex <= activeModuleIndex) return i;
    return active;
  }, -1);

  const hasSections = sections.length > 0;

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Left Sidebar - Tablet & Desktop */}
      {hasSections ? (
        <div className="hidden md:flex flex-col w-56 bg-white border-r border-slate-200">
          {/* Logo + Back + Lesson Title */}
          <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex flex-col items-center text-center">
            <span className="text-lg font-bold mb-3 flex items-center gap-1.5 tracking-tight">
              <span className="material-symbols-outlined text-blue-600 text-[22px]">auto_stories</span>
              <span className="text-slate-800">Nasty</span><span className="text-blue-600">Knowledge</span>
            </span>
            <p className="text-base font-bold text-slate-800 leading-snug">{lessonTitle}</p>
          </div>

          {/* Section List */}
          <div className="flex-1 overflow-y-auto py-2">
            {sections.map((section, i) => (
              <button
                key={section.moduleIndex}
                onClick={() => scrollToModule(section.moduleIndex)}
                className={`relative w-full text-left px-5 py-3 flex items-center gap-3 transition-all ${
                  i === activeSectionIndex ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                {/* Dot */}
                <span className={`flex-shrink-0 size-2.5 rounded-full ${
                  i === activeSectionIndex ? "bg-blue-600" : "bg-slate-300"
                }`} />
                {/* Label */}
                <span className={`flex-1 text-sm line-clamp-2 ${
                  i === activeSectionIndex
                    ? "font-bold text-blue-600"
                    : "font-normal text-slate-500"
                }`}>
                  {section.title || "Untitled"}
                </span>
                {/* Active icon */}
                {i === activeSectionIndex && (
                  <span className="material-symbols-outlined text-blue-400 text-[18px] flex-shrink-0">
                    motion_photos_on
                  </span>
                )}
                {/* Active right bar */}
                {i === activeSectionIndex && (
                  <div className="absolute right-0 top-1 bottom-1 w-1 bg-blue-600 rounded-l-full" />
                )}
              </button>
            ))}
          </div>

          {/* Bottom actions */}
          <div className="px-5 py-4 border-t border-slate-100 flex flex-col items-center gap-2">
            {/* Go Live / End Live button - teacher only */}
            {userRole === 'teacher' && (
              isLive ? (
                <button
                  onClick={endLiveSession}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-red-500 bg-red-500 text-white text-sm font-semibold transition-colors hover:bg-red-600"
                >
                  <span className="size-2 bg-white rounded-full animate-pulse" />
                  Live — End
                </button>
              ) : (
                <button
                  onClick={() => setIsGoLiveOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-red-500 text-red-500 text-sm font-semibold transition-colors hover:bg-red-50"
                >
                  <span className="material-symbols-outlined text-[16px]">sensors</span>
                  Go Live
                </button>
              )
            )}
            {/* Student live indicator */}
            {userRole === 'student' && isLive && (
              <div className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                <span className="size-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-600 text-xs font-semibold">Live lesson</span>
              </div>
            )}
            {/* Finish Lesson */}
            <button
              onClick={async () => {
                if (isLive && userRole === 'teacher') await endLiveSession();
                router.push(`/lessons/${params.level}`);
              }}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-sm font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Finish lesson
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-col w-14 bg-slate-50 border-r border-slate-200 py-4">
          {/* Back Button */}
          <Link
            href={`/lessons/${params.level}`}
            className="mx-auto mb-6 size-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>

          {/* Progress Dots */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            {modules.map((module, index) => (
              <button
                key={module.id}
                onClick={() => scrollToModule(index)}
                className={`group relative size-2.5 rounded-full transition-all ${
                  index === activeModuleIndex
                    ? "bg-blue-600 scale-150"
                    : index < activeModuleIndex
                    ? "bg-blue-400"
                    : "bg-slate-300 hover:bg-slate-400"
                }`}
              >
                {/* Tooltip */}
                <span className="absolute left-8 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {getModuleTypeName(module.type)}
                </span>
              </button>
            ))}
          </div>

          {/* Module Counter */}
          <div className="mx-auto text-center">
            <span className="text-xs font-semibold text-blue-600">{activeModuleIndex + 1}</span>
            <span className="text-xs text-slate-400">/{modules.length}</span>
          </div>

          {/* Go Live / End Live - teacher only */}
          {userRole === 'teacher' && (
            <div className="mt-4 px-1 flex flex-col items-center gap-2">
              {isLive ? (
                <button
                  onClick={endLiveSession}
                  title="End Live"
                  className="size-9 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  <span className="size-2.5 bg-white rounded-full animate-pulse" />
                </button>
              ) : (
                <button
                  onClick={() => setIsGoLiveOpen(true)}
                  title="Go Live"
                  className="size-9 flex items-center justify-center rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">sensors</span>
                </button>
              )}
            </div>
          )}
          {userRole === 'student' && isLive && (
            <div className="mt-4 flex justify-center">
              <span className="size-2.5 bg-red-500 rounded-full animate-pulse" title="Live lesson" />
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Mobile only */}
        <div className="md:hidden flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href={`/lessons/${params.level}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back
            </Link>
            <span className="text-slate-800 font-medium text-sm truncate max-w-[200px]">{lessonTitle}</span>
            <span className="text-slate-500 text-sm font-medium">
              {activeModuleIndex + 1}/{modules.length}
            </span>
          </div>
          {/* Mobile Progress Bar */}
          <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((activeModuleIndex + 1) / modules.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            {/* All Modules */}
            <div className="space-y-10">
              {modules.map((module, index) => {
                const contentIndex = modules.slice(0, index).filter(m => m.type !== "section").length;
                return (
                <div
                  key={module.id}
                  ref={(el) => { moduleRefs.current[index] = el; }}
                >
                  {module.type === "section" ? (
                    /* Section Header Divider */
                    <div className="flex items-center gap-4 pt-2">
                      <div className="h-px flex-1 bg-slate-200" />
                      <h2 className="text-2xl font-bold text-slate-700 whitespace-nowrap px-2">
                        {module.content?.title || "Section"}
                      </h2>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                  ) : (
                  <>
                  {/* Module Header */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="flex items-center justify-center size-7 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                      {contentIndex + 1}
                    </span>
                    <span className="text-slate-700 font-semibold">
                      {getModuleTypeName(module.type)}
                    </span>
                  </div>

                  {/* Module Content */}
                  <div>
                    {/* Text Module */}
                    {module.type === "text" && (
                      <div
                        className="prose prose-slate max-w-none rounded-lg p-4"
                        style={{ backgroundColor: module.content.textBgColor || "transparent" }}
                      >
                        <div className="text-lg text-slate-700 leading-relaxed">
                          {formatText(module.content.text || "")}
                        </div>
                      </div>
                    )}

                    {/* Fill in the Blank Module */}
                    {module.type === "fillblank" && module.content?.sentence && (
                      <div className="space-y-6">
                        <div className="flex flex-col gap-6">
                          {(() => {
                            const sentence = module.content.sentence;
                            const usesNewSyntax = /\d+\./.test(sentence);

                            if (usesNewSyntax) {
                              // Split into lines, render each as its own row
                              const lines = sentence.split(/\n/).filter((l: string) => l.trim() !== "");
                              // Count blanks per line to track global blank index
                              let globalBlankIndex = 0;
                              return lines.map((line: string, lineIdx: number) => {
                                const parts = line.split(/(\d+\.)/g);
                                const lineElements = parts.map((part: string, partIndex: number) => {
                                  const match = part.match(/^(\d+)\.$/);
                                  if (match) {
                                    const blankIndex = globalBlankIndex++;
                                    const userValue = userAnswers[`${module.id}-${blankIndex}`] || "";
                                    const isCorrect = showAnswers[module.id] && module.content?.answers?.[blankIndex] &&
                                      userValue.toLowerCase().trim() === module.content.answers[blankIndex].toLowerCase().trim();
                                    const isWrong = showAnswers[module.id] && userValue && !isCorrect;
                                    return (
                                      <span key={partIndex} className="inline-flex items-center align-middle">
                                        <input
                                          type="text"
                                          className={`inline-block w-28 mx-1 px-2 py-1 border-b-2 text-center font-medium focus:outline-none transition-colors ${
                                            isCorrect
                                              ? "border-green-500 bg-green-50 text-green-700"
                                              : isWrong
                                              ? "border-red-500 bg-red-50 text-red-700"
                                              : "border-blue-400 bg-blue-50 text-slate-700 focus:border-blue-600"
                                          }`}
                                          placeholder="..."
                                          value={userValue}
                                          onChange={(e) => {
                                            const key = `${module.id}-${blankIndex}`;
                                            setUserAnswers(prev => ({ ...prev, [key]: e.target.value }));
                                            broadcastInteraction({ kind: 'fill_blank', key, value: e.target.value, moduleId: module.id });
                                          }}
                                        />
                                        {showAnswers[module.id] && isWrong && (
                                          <span className="text-green-600 font-medium ml-1 text-sm">
                                            {module.content.answers[blankIndex]}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  }
                                  return <span key={partIndex}>{part}</span>;
                                });
                                return (
                                  <p key={lineIdx} className="text-lg text-slate-700 leading-loose">
                                    {lineElements}
                                  </p>
                                );
                              });
                            } else {
                              // Old {} syntax for backwards compatibility
                              return sentence.split("{").map((part: string, i: number) => {
                                if (i === 0) return <span key={i}>{part}</span>;
                                const [, rest] = part.split("}");
                                const blankIndex = i - 1;
                                const userValue = userAnswers[`${module.id}-${blankIndex}`] || "";
                                const isCorrect = showAnswers[module.id] && module.content?.answers?.[blankIndex] &&
                                  userValue.toLowerCase().trim() === module.content.answers[blankIndex].toLowerCase().trim();
                                const isWrong = showAnswers[module.id] && userValue && !isCorrect;

                                return (
                                  <span key={i}>
                                    <input
                                      type="text"
                                      className={`inline-block w-28 mx-1 px-2 py-1 border-b-2 text-center font-medium focus:outline-none transition-colors ${
                                        isCorrect
                                          ? "border-green-500 bg-green-50 text-green-700"
                                          : isWrong
                                          ? "border-red-500 bg-red-50 text-red-700"
                                          : "border-blue-400 bg-blue-50 text-slate-700 focus:border-blue-600"
                                      }`}
                                      placeholder="..."
                                      value={userValue}
                                      onChange={(e) => {
                                        const key = `${module.id}-${blankIndex}`;
                                        setUserAnswers(prev => ({ ...prev, [key]: e.target.value }));
                                        broadcastInteraction({ kind: 'fill_blank', key, value: e.target.value, moduleId: module.id });
                                      }}
                                    />
                                    {showAnswers[module.id] && isWrong && (
                                      <span className="text-green-600 font-medium ml-1 text-sm">
                                        {module.content.answers[blankIndex]}
                                      </span>
                                    )}
                                    {rest}
                                  </span>
                                );
                              });
                            }
                          })()}
                        </div>
                        {/* Check Answers Button - Bottom */}
                        <button
                          onClick={() => toggleAnswer(module.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {showAnswers[module.id] ? "Hide Answers" : "Check Answers"}
                        </button>
                      </div>
                    )}

                    {/* Quiz Module */}
                    {module.type === "quiz" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-slate-800 mb-4">
                          {formatInline(module.content.question || "")}
                        </h3>

                        {/* Question Media */}
                        {(module.content.questionImageUrl || module.content.questionAudioUrl) && (
                          <div className="space-y-3 mb-4">
                            {module.content.questionImageUrl && (
                              <div
                                onClick={() => setLightboxImage(module.content.questionImageUrl)}
                                className="w-full rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={module.content.questionImageUrl}
                                  alt="Question"
                                  className="w-full h-auto object-contain"
                                />
                              </div>
                            )}
                            {module.content.questionAudioUrl && (
                              <audio controls className="w-full" style={{ height: '40px' }}>
                                <source src={module.content.questionAudioUrl} />
                              </audio>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          {module.content.options.map((option: any, i: number) => {
                            const isSelected = userAnswers[module.id] === i;
                            const isCorrectOption = typeof option === 'string' ? false : option.isCorrect;
                            const showAnswer = showAnswers[module.id];

                            let buttonClass = "border-slate-200 hover:border-slate-300 hover:bg-slate-50";
                            let indicatorClass = "border-slate-300";

                            if (showAnswer) {
                              if (isCorrectOption) {
                                buttonClass = "border-green-500 bg-green-50";
                                indicatorClass = "border-green-500 bg-green-500";
                              } else if (isSelected) {
                                buttonClass = "border-red-500 bg-red-50";
                                indicatorClass = "border-red-500";
                              }
                            } else if (isSelected) {
                              buttonClass = "border-blue-500 bg-blue-50";
                              indicatorClass = "border-blue-500 bg-blue-500";
                            }

                            return (
                              <button
                                key={i}
                                onClick={() => handleAnswerChange(module.id, i, true)}
                                className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${buttonClass}`}
                              >
                                <span className={`flex items-center justify-center size-5 rounded-full border-2 transition-colors ${indicatorClass}`}>
                                  {(isSelected || (showAnswer && isCorrectOption)) && (
                                    <span className="material-symbols-outlined text-white text-[14px]">
                                      {showAnswer && isCorrectOption ? "check" : ""}
                                    </span>
                                  )}
                                </span>
                                <span className="text-slate-700">{typeof option === 'string' ? option : option.text}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* True/False Module */}
                    {module.type === "truefalse" && (
                      <div className="space-y-4">
                        {module.content.trueFalseTitle && (
                          <h3 className="text-lg font-medium text-slate-800 mb-4">
                            {module.content.trueFalseTitle}
                          </h3>
                        )}

                        <div className="space-y-3">
                          {module.content.trueFalseStatements?.map((statement: TrueFalseStatement) => {
                            const tfState = trueFalseStates[module.id] || { answers: {}, showResults: false };
                            const userAnswer = tfState.answers[statement.id];
                            const isAnswered = userAnswer !== null && userAnswer !== undefined;
                            const isCorrect = userAnswer === statement.isTrue;

                            return (
                              <div key={statement.id} className="flex items-center gap-4 py-3">
                                <p className="flex-1 text-slate-700">
                                  {formatInline(statement.statement || "")}
                                </p>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setTrueFalseStates(prev => ({
                                        ...prev,
                                        [module.id]: {
                                          ...prev[module.id] || { showResults: false },
                                          answers: { ...(prev[module.id]?.answers || {}), [statement.id]: true }
                                        }
                                      }));
                                      broadcastInteraction({ kind: 'truefalse', moduleId: module.id, statementId: statement.id, value: true });
                                    }}
                                    className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                                      tfState.showResults && isAnswered
                                        ? userAnswer === true
                                          ? isCorrect
                                            ? "border-green-500 bg-green-50 text-green-700"
                                            : "border-red-500 bg-red-50 text-red-700"
                                          : statement.isTrue
                                            ? "border-green-500 bg-green-50 text-green-700"
                                            : "border-slate-200 text-slate-400"
                                        : userAnswer === true
                                          ? "border-blue-500 bg-blue-50 text-blue-700"
                                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                                    }`}
                                  >
                                    True
                                  </button>

                                  <button
                                    onClick={() => {
                                      setTrueFalseStates(prev => ({
                                        ...prev,
                                        [module.id]: {
                                          ...prev[module.id] || { showResults: false },
                                          answers: { ...(prev[module.id]?.answers || {}), [statement.id]: false }
                                        }
                                      }));
                                      broadcastInteraction({ kind: 'truefalse', moduleId: module.id, statementId: statement.id, value: false });
                                    }}
                                    className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                                      tfState.showResults && isAnswered
                                        ? userAnswer === false
                                          ? isCorrect
                                            ? "border-green-500 bg-green-50 text-green-700"
                                            : "border-red-500 bg-red-50 text-red-700"
                                          : !statement.isTrue
                                            ? "border-green-500 bg-green-50 text-green-700"
                                            : "border-slate-200 text-slate-400"
                                        : userAnswer === false
                                          ? "border-blue-500 bg-blue-50 text-blue-700"
                                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                                    }`}
                                  >
                                    False
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            const next = !trueFalseStates[module.id]?.showResults;
                            setTrueFalseStates(prev => ({
                              ...prev,
                              [module.id]: { ...prev[module.id] || { answers: {} }, showResults: next }
                            }));
                            broadcastInteraction({ kind: 'show_results', stateType: 'truefalse', moduleId: module.id, value: next });
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {trueFalseStates[module.id]?.showResults ? "Hide Results" : "Check Answers"}
                        </button>
                      </div>
                    )}

                    {/* Image Choice Module */}
                    {module.type === "imagechoice" && (
                      <div className="space-y-4">
                        {module.content.imageChoiceTitle && (
                          <h3 className="text-lg font-medium text-slate-800 mb-4">
                            {module.content.imageChoiceTitle}
                          </h3>
                        )}

                        {module.content.imageChoiceItems && module.content.imageChoiceItems.length > 0 && (
                          <div className={`grid gap-4 ${
                            module.content.imageChoiceItems.length === 1
                              ? "grid-cols-1 max-w-sm mx-auto"
                              : module.content.imageChoiceItems.length === 2
                              ? "grid-cols-2 max-w-2xl mx-auto"
                              : module.content.imageChoiceItems.length === 3
                              ? "grid-cols-3"
                              : module.content.imageChoiceItems.length === 4
                              ? "grid-cols-2"
                              : "grid-cols-3"
                          }`}>
                            {module.content.imageChoiceItems.map((item: ImageChoiceItem) => {
                              const icState = imageChoiceStates[module.id] || { selections: {}, shuffledOptions: {}, showResults: false };
                              const selectedValue = icState.selections[item.id] || "";
                              const isCorrect = selectedValue === item.correctOption;
                              const allOptions = icState.shuffledOptions[item.id] || [item.correctOption, ...item.options].filter(o => o);

                              return (
                                <div key={item.id} className="flex flex-col">
                                  {/* Image */}
                                  <div
                                    onClick={() => item.imageUrl && setLightboxImage(item.imageUrl)}
                                    className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                  >
                                    {item.imageUrl ? (
                                      <img
                                        src={item.imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Dropdown */}
                                  <div className="relative">
                                    <select
                                      value={selectedValue}
                                      onChange={(e) => {
                                        setImageChoiceStates(prev => ({
                                          ...prev,
                                          [module.id]: {
                                            ...prev[module.id] || { showResults: false },
                                            selections: { ...(prev[module.id]?.selections || {}), [item.id]: e.target.value }
                                          }
                                        }));
                                        broadcastInteraction({ kind: 'imagechoice', moduleId: module.id, itemId: item.id, value: e.target.value });
                                      }}
                                      className={`w-full px-3 py-2 rounded-lg border text-sm appearance-none cursor-pointer transition-colors ${
                                        icState.showResults && selectedValue
                                          ? isCorrect
                                            ? "border-green-500 bg-green-50 text-green-700"
                                            : "border-red-500 bg-red-50 text-red-700"
                                          : selectedValue
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-slate-200 text-slate-600"
                                      }`}
                                    >
                                      <option value="">Select...</option>
                                      {allOptions.map((opt, i) => (
                                        <option key={i} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                                      expand_more
                                    </span>
                                  </div>

                                  {/* Show correct answer if wrong */}
                                  {icState.showResults && selectedValue && !isCorrect && (
                                    <p className="text-xs text-green-600 mt-1 font-medium">
                                      {item.correctOption}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Check Answers Button - Bottom */}
                        <button
                          onClick={() => {
                            const next = !imageChoiceStates[module.id]?.showResults;
                            setImageChoiceStates(prev => ({
                              ...prev,
                              [module.id]: { ...prev[module.id] || { selections: {}, shuffledOptions: {} }, showResults: next }
                            }));
                            broadcastInteraction({ kind: 'show_results', stateType: 'imagechoice', moduleId: module.id, value: next });
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {imageChoiceStates[module.id]?.showResults ? "Hide Results" : "Check Answers"}
                        </button>
                      </div>
                    )}

                    {/* Inline Choice Module */}
                    {module.type === "inlinechoice" && (
                      <div className="space-y-4">
                        {module.content.inlineChoiceTitle && (
                          <h3 className="text-lg font-medium text-slate-800 mb-4">
                            {module.content.inlineChoiceTitle}
                          </h3>
                        )}

                        {/* Sentences */}
                        <div className="space-y-4">
                          {module.content.inlineChoiceSentences?.map((sentence: InlineChoiceSentence, sentenceIndex: number) => {
                            const icState = inlineChoiceStates[module.id] || { selections: {}, shuffledOptions: {}, showResults: false };

                            // Parse the sentence and replace 1., 2., etc. with dropdowns
                            const parts = sentence.text.split(/(\d+\.)/g);

                            return (
                              <p key={sentence.id} className="text-slate-700 leading-loose">
                                <span className="font-semibold text-slate-500 mr-2">{sentenceIndex + 1}.</span>
                                {parts.map((part, partIndex) => {
                                  const match = part.match(/^(\d+)\.$/);
                                  if (match) {
                                    const blankIndex = parseInt(match[1]) - 1; // Convert 1-based to 0-based
                                    const blank = sentence.blanks[blankIndex];
                                    if (!blank) return null;

                                    const selectedValue = icState.selections[sentence.id]?.[blankIndex] || "";
                                    const isCorrect = selectedValue === blank.correctAnswer;
                                    const options = icState.shuffledOptions[sentence.id]?.[blankIndex] || [blank.correctAnswer, ...blank.options].filter(o => o);

                                    return (
                                      <span key={partIndex} className="inline-flex items-center align-middle mx-1">
                                        <span className="relative inline-block">
                                          <select
                                            value={selectedValue}
                                            onChange={(e) => {
                                              setInlineChoiceStates(prev => ({
                                                ...prev,
                                                [module.id]: {
                                                  ...prev[module.id] || { shuffledOptions: {}, showResults: false },
                                                  selections: {
                                                    ...(prev[module.id]?.selections || {}),
                                                    [sentence.id]: {
                                                      ...(prev[module.id]?.selections?.[sentence.id] || {}),
                                                      [blankIndex]: e.target.value
                                                    }
                                                  }
                                                }
                                              }));
                                              broadcastInteraction({ kind: 'inlinechoice', moduleId: module.id, sentenceId: sentence.id, blankIndex, value: e.target.value });
                                            }}
                                            className={`px-2 py-0.5 pr-6 rounded border text-sm appearance-none cursor-pointer transition-colors ${
                                              icState.showResults && selectedValue
                                                ? isCorrect
                                                  ? "border-green-500 bg-green-50 text-green-700"
                                                  : "border-red-500 bg-red-50 text-red-700"
                                                : selectedValue
                                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                                  : "border-slate-300 text-slate-600"
                                            }`}
                                          >
                                            <option value="">Select...</option>
                                            {options.map((opt, i) => (
                                              <option key={i} value={opt}>{opt}</option>
                                            ))}
                                          </select>
                                          <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[14px]">
                                            expand_more
                                          </span>
                                        </span>
                                        {icState.showResults && selectedValue && !isCorrect && (
                                          <span className="text-green-600 text-xs font-medium ml-1">
                                            {blank.correctAnswer}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  }
                                  return <span key={partIndex}>{part}</span>;
                                })}
                              </p>
                            );
                          })}
                        </div>

                        {/* Check Answers Button - Bottom */}
                        <button
                          onClick={() => {
                            const next = !inlineChoiceStates[module.id]?.showResults;
                            setInlineChoiceStates(prev => ({
                              ...prev,
                              [module.id]: { ...prev[module.id] || { selections: {}, shuffledOptions: {} }, showResults: next }
                            }));
                            broadcastInteraction({ kind: 'show_results', stateType: 'inlinechoice', moduleId: module.id, value: next });
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {inlineChoiceStates[module.id]?.showResults ? "Hide Results" : "Check Answers"}
                        </button>
                      </div>
                    )}

                    {/* Matching Module */}
                    {module.type === "matching" && (
                      <div className="space-y-4">
                        {matchingStates[module.id]?.matchedPairs && matchingStates[module.id].matchedPairs.size > 0 && (
                          <p className="text-sm text-green-600 font-medium">
                            {matchingStates[module.id].matchedPairs.size} / {module.content.pairs?.length} matched
                            {matchingStates[module.id].matchedPairs.size === module.content.pairs?.length && " - Complete!"}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Left Column */}
                          <div className="space-y-2">
                            {matchingStates[module.id]?.shuffledLeftItems.map((item: any, i: number) => {
                              const state = matchingStates[module.id];
                              const isMatched = state?.matchedPairs.has(`${item.originalIndex}`);
                              const isSelected = state?.selectedLeft === i;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => handleMatchingClick(module.id, "left", item, i, module.content.pairs)}
                                  disabled={isMatched}
                                  className={`w-full p-3 rounded-lg border transition-all min-h-[60px] flex items-center justify-center ${
                                    isMatched
                                      ? "border-green-500 bg-green-50 text-green-700"
                                      : isSelected
                                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                      : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                                  }`}
                                >
                                  {item.image ? (
                                    <img src={item.image} alt="Left" className="max-h-16 max-w-full object-contain" />
                                  ) : (
                                    <span className="text-sm font-medium">{item.text}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Right Column */}
                          <div className="space-y-2">
                            {matchingStates[module.id]?.shuffledRightItems.map((item: any, i: number) => {
                              const state = matchingStates[module.id];
                              const isMatched = state?.matchedPairs.has(`${item.originalIndex}`);
                              const isSelected = state?.selectedRight === i;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => handleMatchingClick(module.id, "right", item, i, module.content.pairs)}
                                  disabled={isMatched}
                                  className={`w-full p-3 rounded-lg border transition-all min-h-[60px] flex items-center justify-center ${
                                    isMatched
                                      ? "border-green-500 bg-green-50 text-green-700"
                                      : isSelected
                                      ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                                      : "border-slate-200 hover:border-purple-300 hover:bg-purple-50/50"
                                  }`}
                                >
                                  {item.image ? (
                                    <img src={item.image} alt="Right" className="max-h-16 max-w-full object-contain" />
                                  ) : (
                                    <span className="text-sm font-medium">{item.text}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Audio Module */}
                    {module.type === "audio" && (
                      <div className="py-4">
                        {module.content.audioItems && module.content.audioItems.length > 0 ? (
                          module.content.audioPlayMode === "click" ? (
                            /* Click to Play Mode - Button style */
                            <div className={`grid gap-6 ${
                              module.content.audioItems.length === 1
                                ? "grid-cols-1 max-w-xs"
                                : module.content.audioItems.length === 2
                                ? "grid-cols-2 max-w-md"
                                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                            }`}>
                              {module.content.audioItems.map((item: AudioItem) => {
                                const isThisPlaying = currentAudioUrl === item.audioUrl && isAudioPlaying;
                                return (
                                  <div key={item.id} className="flex flex-col items-center">
                                    <button
                                      onClick={() => toggleAudio(item.audioUrl)}
                                      className={`size-20 rounded-full ${isThisPlaying ? 'bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'} active:scale-95 flex items-center justify-center mb-3 transition-all shadow-md`}
                                    >
                                      <span className="material-symbols-outlined text-white text-4xl">
                                        {isThisPlaying ? 'pause' : 'volume_up'}
                                      </span>
                                    </button>
                                    {item.title && (
                                      <p className="text-sm font-medium text-slate-700 text-center">{item.title}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* Controls Mode - Full audio player with waveform */
                            <div className="space-y-4 max-w-2xl">
                              {module.content.audioItems.map((item: AudioItem) => (
                                <WaveformPlayer
                                  key={item.id}
                                  audioUrl={item.audioUrl}
                                  title={item.title}
                                />
                              ))}
                            </div>
                          )
                        ) : (
                          <p className="text-slate-500 text-sm">No audio items added</p>
                        )}
                      </div>
                    )}

                    {/* Image Module */}
                    {module.type === "image" && (
                      <div className="py-2">
                        {module.content.imageItems && module.content.imageItems.length > 0 ? (
                          <>
                            {/* Single image - full width display */}
                            {module.content.imageItems.length === 1 ? (
                              <div className="flex flex-col items-center">
                                {module.content.imageItems.map((item: ImageItem) => (
                                  <div key={item.id} className="w-full flex flex-col items-center">
                                    {item.imageUrl ? (
                                      <div
                                        onClick={() => setLightboxImage(item.imageUrl)}
                                        className={`rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity ${
                                          item.orientation === "portrait"
                                            ? "h-[70vh] w-auto"
                                            : "w-full"
                                        }`}
                                      >
                                        <img
                                          src={item.imageUrl}
                                          alt={item.caption || "Image"}
                                          className={`${
                                            item.orientation === "portrait"
                                              ? "h-full w-auto object-contain"
                                              : "w-full h-auto object-contain"
                                          }`}
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-full h-64 flex items-center justify-center bg-slate-100 rounded-lg">
                                        <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
                                      </div>
                                    )}
                                    {item.caption && (
                                      <p className="mt-3 text-sm font-medium text-slate-700 text-center">{item.caption}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : module.content.imageItems.length === 2 ? (
                              /* Two images - larger side by side display */
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {module.content.imageItems.map((item: ImageItem) => (
                                  <div key={item.id} className="flex flex-col">
                                    <div
                                      onClick={() => item.imageUrl && setLightboxImage(item.imageUrl)}
                                      className={`rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity ${
                                        item.orientation === "portrait"
                                          ? "h-[50vh] flex justify-center bg-slate-50"
                                          : "w-full"
                                      }`}
                                    >
                                      {item.imageUrl ? (
                                        <img
                                          src={item.imageUrl}
                                          alt={item.caption || "Image"}
                                          className={`${
                                            item.orientation === "portrait"
                                              ? "h-full w-auto object-contain"
                                              : "w-full h-auto object-contain"
                                          }`}
                                        />
                                      ) : (
                                        <div className="w-full h-64 flex items-center justify-center bg-slate-100">
                                          <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
                                        </div>
                                      )}
                                    </div>
                                    {item.caption && (
                                      <p className="mt-2 text-sm font-medium text-slate-700 text-center">{item.caption}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              /* 3+ images - grid display */
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {module.content.imageItems.map((item: ImageItem) => (
                                  <div key={item.id} className="flex flex-col">
                                    <div
                                      onClick={() => item.imageUrl && setLightboxImage(item.imageUrl)}
                                      className={`rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity ${
                                        item.orientation === "portrait" ? "aspect-[3/4]" : "aspect-video"
                                      }`}
                                    >
                                      {item.imageUrl ? (
                                        <img
                                          src={item.imageUrl}
                                          alt={item.caption || "Image"}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
                                        </div>
                                      )}
                                    </div>
                                    {item.caption && (
                                      <p className="mt-2 text-sm font-medium text-slate-700 text-center">{item.caption}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-slate-500 text-sm">No images added</p>
                        )}
                      </div>
                    )}

                    {/* PDF Module */}
                    {module.type === "pdf" && (
                      <div>
                        {module.content.pdfUrl ? (
                          <PdfViewer url={module.content.pdfUrl} className="h-[500px] lg:h-[700px]" />
                        ) : (
                          <p className="text-slate-500 text-sm">No PDF uploaded</p>
                        )}
                      </div>
                    )}

                    {/* Wordwall Module */}
                    {module.type === "wordwall" && module.content?.wordwallIframe && (
                      <div className="w-full h-[400px] lg:h-[500px]">
                        <div
                          className="w-full h-full"
                          dangerouslySetInnerHTML={{
                            __html: module.content.wordwallIframe
                              .replace(/width="[^"]*"/g, 'width="100%"')
                              .replace(/height="[^"]*"/g, 'height="100%"')
                              .replace(/style="[^"]*"/g, 'style="width:100%;height:100%"')
                          }}
                        />
                      </div>
                    )}

                    {/* Baamboozle Module */}
                    {module.type === "baamboozle" && module.content?.baamboozleUrl && (
                      <div className="py-4">
                        <a
                          href={module.content.baamboozleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                          Open Baamboozle Activity
                        </a>
                      </div>
                    )}

                    {/* Quizlet Module */}
                    {module.type === "quizlet" && module.content?.quizletIframe && (
                      <div className="w-full h-[400px] lg:h-[500px]">
                        <div
                          className="w-full h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:rounded-lg"
                          dangerouslySetInnerHTML={{
                            __html: module.content.quizletIframe
                              .replace(/width="[^"]*"/g, 'width="100%"')
                              .replace(/height="[^"]*"/g, 'height="100%"')
                          }}
                        />
                      </div>
                    )}

                    {/* Genially Module */}
                    {module.type === "genially" && module.content?.geniallyUrl && (
                      <div className="w-full h-[400px] lg:h-[500px]">
                        <iframe
                          src={module.content.geniallyUrl}
                          className="w-full h-full rounded-lg border-0"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* Miro Module */}
                    {module.type === "miro" && module.content?.miroUrl && (
                      <div className="w-full h-[400px] lg:h-[500px]">
                        <iframe
                          src={(() => {
                            const url = module.content.miroUrl;
                            if (url.includes('/live-embed/')) return url;
                            if (url.includes('/app/board/')) {
                              return url.replace('/app/board/', '/app/live-embed/');
                            }
                            return url;
                          })()}
                          className="w-full h-full rounded-lg border-0"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* Iframe / Embed Module */}
                    {module.type === "iframe" && module.content?.iframeCode && (() => {
                      const code = module.content.iframeCode.trim();
                      const height = module.content.iframeHeight || 450;
                      // TikTok embed code → convert to iframe URL
                      const tiktokMatch = code.match(/data-video-id="(\d+)"/);
                      if (tiktokMatch) {
                        return (
                          <div className="w-full flex justify-center">
                            <iframe
                              src={`https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`}
                              className="rounded-lg border-0"
                              style={{ width: "605px", height: "700px", maxWidth: "100%" }}
                              allowFullScreen
                              allow="encrypted-media"
                            />
                          </div>
                        );
                      }
                      // Raw HTML embed code (not TikTok)
                      if (code.startsWith("<")) {
                        return (
                          <div
                            style={{ height: `${height}px` }}
                            className="w-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:rounded-lg [&_iframe]:border-0"
                            dangerouslySetInnerHTML={{ __html: code }}
                          />
                        );
                      }
                      // Plain URL
                      return (
                        <div style={{ height: `${height}px` }} className="w-full overflow-x-hidden overflow-y-auto">
                          <iframe
                            src={code}
                            className="w-full h-full rounded-lg border-0"
                            allowFullScreen
                          />
                        </div>
                      );
                    })()}

                    {/* YouTube Video */}
                    {module.type === "youtube" && module.content?.youtubeUrl && (
                      <div className="w-full">
                        {module.content.youtubeTitle && (
                          <h3 className="text-lg font-semibold text-slate-800 mb-3">
                            {module.content.youtubeTitle}
                          </h3>
                        )}
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <iframe
                            src={`https://www.youtube.com/embed/${module.content.youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1] || ''}`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}

                    {/* Vocabulary Cards */}
                    {module.type === "vocabulary" && (
                      <div className="w-full">
                        {module.content.vocabularyTitle && (
                          <h3 className="text-lg font-semibold text-slate-800 mb-4">
                            {module.content.vocabularyTitle}
                          </h3>
                        )}
                        {module.content.vocabularyItems && module.content.vocabularyItems.length > 0 ? (
                          <div className="space-y-3">
                            {module.content.vocabularyItems.map((item: any) => {
                              const isThisPlaying = currentAudioUrl === item.audioUrl && isAudioPlaying;
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                                >
                                  {/* Image */}
                                  {item.imageUrl && (
                                    <div
                                      onClick={() => setLightboxImage(item.imageUrl)}
                                      className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                                    >
                                      <img
                                        src={item.imageUrl}
                                        alt={item.word}
                                        className="w-20 h-20 md:w-28 md:h-28 object-cover rounded-xl border border-slate-200"
                                      />
                                    </div>
                                  )}

                                  {/* Audio Button */}
                                  {item.audioUrl && (
                                    <button
                                      onClick={() => toggleAudio(item.audioUrl)}
                                      className={`flex-shrink-0 size-10 md:size-12 rounded-full ${isThisPlaying ? 'bg-blue-100' : 'bg-slate-100 hover:bg-slate-200'} flex items-center justify-center transition-colors`}
                                    >
                                      <span className={`material-symbols-outlined ${isThisPlaying ? 'text-blue-600' : 'text-slate-600'} text-xl md:text-2xl`}>
                                        {isThisPlaying ? 'pause' : 'volume_up'}
                                      </span>
                                    </button>
                                  )}

                                  {/* Word and Definition */}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-base md:text-lg font-bold text-slate-800">
                                      {item.word}
                                    </h4>
                                    {item.definition && (
                                      <p className="text-sm text-slate-500 mt-0.5">
                                        {item.definition}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">No vocabulary items added</p>
                        )}
                      </div>
                    )}
                  </div>
                  </>
                  )}
                </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* Go Live Modal */}
      {isGoLiveOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-lg">Start Live Lesson</h2>
              <button onClick={() => setIsGoLiveOpen(false)}>
                <span className="material-symbols-outlined text-slate-400 hover:text-slate-600">close</span>
              </button>
            </div>
            <p className="text-slate-500 text-sm mb-4">Select students to invite</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto mb-5">
              {allStudents.map(student => (
                <label key={student.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={(e) => {
                      setSelectedStudentIds(prev =>
                        e.target.checked ? [...prev, student.id] : prev.filter(id => id !== student.id)
                      );
                    }}
                    className="rounded accent-red-500"
                  />
                  <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                    {student.initials}
                  </div>
                  <span className="text-slate-700 text-sm font-medium">{student.name}</span>
                </label>
              ))}
            </div>
            <button
              onClick={startLiveSession}
              disabled={selectedStudentIds.length === 0}
              className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">sensors</span>
              Start ({selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''})
            </button>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          {/* Image */}
          <img
            src={lightboxImage}
            alt="Expanded view"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
