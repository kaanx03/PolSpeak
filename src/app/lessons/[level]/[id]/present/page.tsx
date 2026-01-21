"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchLessonContentById } from "@/lib/supabase-helpers";

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
  type: "fillblank" | "pdf" | "image" | "quiz" | "text" | "audio" | "matching" | "wordwall" | "miro" | "quizlet" | "genially" | "baamboozle" | "truefalse" | "imagechoice" | "inlinechoice";
  content: any;
}

// Helper function to render text with bold, italic, and underline formatting
const formatText = (text: string) => {
  if (!text) return null;
  // Split by bold (**text**), italic (*text*), and underline (__text__)
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

export default function PresentationPage() {
  const params = useParams();
  const [lessonTitle, setLessonTitle] = useState("Loading...");
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const moduleRefs = useRef<(HTMLDivElement | null)[]>([]);

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
  };

  const toggleAnswer = (moduleId: string) => {
    setShowAnswers(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const playAudio = (audioUrl: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    audio.play();
  };

  const scrollToModule = (index: number) => {
    const ref = moduleRefs.current[index];
    if (ref && contentRef.current) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    };
    return names[type] || type;
  };

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Left Progress Bar - Desktop */}
      <div className="hidden lg:flex flex-col w-14 bg-slate-50 border-r border-slate-200 py-4">
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Mobile */}
        <div className="lg:hidden flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3">
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
            {/* Lesson Title - Desktop only */}
            <div className="hidden lg:block text-center mb-10">
              <h1 className="text-2xl font-bold text-slate-800">{lessonTitle}</h1>
            </div>

            {/* All Modules */}
            <div className="space-y-10">
              {modules.map((module, index) => (
                <div
                  key={module.id}
                  ref={(el) => { moduleRefs.current[index] = el; }}
                >
                  {/* Module Header */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="flex items-center justify-center size-7 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                      {index + 1}
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
                        <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {formatText(module.content.text || "")}
                        </p>
                      </div>
                    )}

                    {/* Fill in the Blank Module */}
                    {module.type === "fillblank" && module.content?.sentence && (
                      <div className="space-y-6">
                        <p className="text-lg text-slate-700 leading-loose">
                          {(() => {
                            // Check if using new 1. 2. syntax or old {} syntax
                            const sentence = module.content.sentence;
                            const usesNewSyntax = /\d+\./.test(sentence);

                            if (usesNewSyntax) {
                              // Parse with 1. 2. syntax
                              const parts = sentence.split(/(\d+\.)/g);
                              return parts.map((part: string, partIndex: number) => {
                                const match = part.match(/^(\d+)\.$/);
                                if (match) {
                                  const blankIndex = parseInt(match[1]) - 1;
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
                                          setUserAnswers(prev => ({
                                            ...prev,
                                            [`${module.id}-${blankIndex}`]: e.target.value,
                                          }));
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
                                        setUserAnswers(prev => ({
                                          ...prev,
                                          [`${module.id}-${blankIndex}`]: e.target.value,
                                        }));
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
                        </p>
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
                          {formatText(module.content.question || "")}
                        </h3>

                        {/* Question Media */}
                        {(module.content.questionImageUrl || module.content.questionAudioUrl) && (
                          <div className="space-y-3 mb-4">
                            {module.content.questionImageUrl && (
                              <div className="w-full rounded-lg overflow-hidden border border-slate-200">
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
                                  {formatText(statement.statement || "")}
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
                            setTrueFalseStates(prev => ({
                              ...prev,
                              [module.id]: {
                                ...prev[module.id] || { answers: {} },
                                showResults: !prev[module.id]?.showResults
                              }
                            }));
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
                                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mb-2">
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
                            setImageChoiceStates(prev => ({
                              ...prev,
                              [module.id]: {
                                ...prev[module.id] || { selections: {}, shuffledOptions: {} },
                                showResults: !prev[module.id]?.showResults
                              }
                            }));
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
                            setInlineChoiceStates(prev => ({
                              ...prev,
                              [module.id]: {
                                ...prev[module.id] || { selections: {}, shuffledOptions: {} },
                                showResults: !prev[module.id]?.showResults
                              }
                            }));
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
                          <div className={`grid gap-6 ${
                            module.content.audioItems.length === 1
                              ? "grid-cols-1 max-w-xs"
                              : module.content.audioItems.length === 2
                              ? "grid-cols-2 max-w-md"
                              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                          }`}>
                            {module.content.audioItems.map((item: AudioItem) => (
                              <div key={item.id} className="flex flex-col items-center">
                                <button
                                  onClick={() => playAudio(item.audioUrl)}
                                  className="size-20 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 flex items-center justify-center mb-3 transition-all shadow-md"
                                >
                                  <span className="material-symbols-outlined text-white text-4xl">volume_up</span>
                                </button>
                                {item.title && (
                                  <p className="text-sm font-medium text-slate-700 text-center">{item.title}</p>
                                )}
                              </div>
                            ))}
                          </div>
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
                                      <div className={`rounded-lg overflow-hidden border border-slate-200 ${
                                        item.orientation === "portrait"
                                          ? "h-[70vh] w-auto"
                                          : "w-full"
                                      }`}>
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
                                    <div className={`rounded-lg overflow-hidden border border-slate-200 ${
                                      item.orientation === "portrait"
                                        ? "h-[50vh] flex justify-center bg-slate-50"
                                        : "w-full"
                                    }`}>
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
                                    <div className={`rounded-lg overflow-hidden bg-slate-100 border border-slate-200 ${
                                      item.orientation === "portrait" ? "aspect-[3/4]" : "aspect-video"
                                    }`}>
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
                          <iframe
                            src={module.content.pdfUrl}
                            className="w-full h-[500px] lg:h-[700px] rounded-lg border border-slate-200"
                            title={module.content.pdfName || "PDF Document"}
                          />
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
                  </div>
                </div>
              ))}
            </div>

            {/* End of Lesson */}
            <div className="text-center py-10 mt-6 border-t border-slate-200">
              <p className="text-slate-500 mb-4">End of lesson</p>
              <Link
                href={`/lessons/${params.level}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Lessons
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
