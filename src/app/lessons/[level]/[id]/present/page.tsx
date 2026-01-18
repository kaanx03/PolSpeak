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
}

interface Module {
  id: string;
  type: "fillblank" | "pdf" | "image" | "quiz" | "text" | "audio" | "matching" | "wordwall" | "miro" | "quizlet" | "genially" | "baamboozle";
  content: any;
}

export default function PresentationPage() {
  const params = useParams();
  const [lessonTitle, setLessonTitle] = useState("Loading...");
  const [modules, setModules] = useState<Module[]>([]);

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

  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({});
  const [showAnswer, setShowAnswer] = useState(false);

  // Audio management
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Matching game state
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [shuffledLeftItems, setShuffledLeftItems] = useState<any[]>([]);
  const [shuffledRightItems, setShuffledRightItems] = useState<any[]>([]);

  // Stop audio when changing modules
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [currentModuleIndex]);

  const currentModule = modules[currentModuleIndex];
  const isFirstModule = currentModuleIndex === 0;
  const isLastModule = currentModuleIndex === modules.length - 1;

  const goToNext = () => {
    if (!isLastModule) {
      setCurrentModuleIndex(currentModuleIndex + 1);
      setShowAnswer(false);
      resetMatchingGame();
    }
  };

  const goToPrevious = () => {
    if (!isFirstModule) {
      setCurrentModuleIndex(currentModuleIndex - 1);
      setShowAnswer(false);
      resetMatchingGame();
    }
  };

  const resetMatchingGame = () => {
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs(new Set());
    setShuffledLeftItems([]);
    setShuffledRightItems([]);
  };

  // Shuffle both sides when matching module loads
  useEffect(() => {
    if (currentModule?.type === "matching" && currentModule.content.pairs) {
      // Reset game state
      setSelectedLeft(null);
      setSelectedRight(null);
      setMatchedPairs(new Set());

      // Shuffle left items
      const leftItems = currentModule.content.pairs.map((pair: any, index: number) => ({
        text: pair.left,
        image: pair.leftImage,
        originalIndex: index,
        id: `left-${index}`,
      }));
      const shuffledLeft = [...leftItems].sort(() => Math.random() - 0.5);
      setShuffledLeftItems(shuffledLeft);

      // Shuffle right items
      const rightItems = currentModule.content.pairs.map((pair: any, index: number) => ({
        text: pair.right,
        image: pair.rightImage,
        originalIndex: index,
        id: `right-${index}`,
      }));
      const shuffledRight = [...rightItems].sort(() => Math.random() - 0.5);
      setShuffledRightItems(shuffledRight);
    }
  }, [currentModule]);

  const handleMatchingClick = (side: "left" | "right", item: any, displayIndex: number) => {
    const pairId = `${item.originalIndex}`;
    if (matchedPairs instanceof Set && matchedPairs.has(pairId)) return; // Already matched

    if (side === "left") {
      if (selectedLeft === displayIndex) {
        setSelectedLeft(null); // Deselect
      } else {
        setSelectedLeft(displayIndex);
        // Check if we have both selected
        if (selectedRight !== null) {
          const rightItem = shuffledRightItems[selectedRight];
          checkMatch(item, rightItem);
        }
      }
    } else {
      if (selectedRight === displayIndex) {
        setSelectedRight(null); // Deselect
      } else {
        setSelectedRight(displayIndex);
        // Check if we have both selected
        if (selectedLeft !== null) {
          const leftItem = shuffledLeftItems[selectedLeft];
          checkMatch(leftItem, item);
        }
      }
    }
  };

  const checkMatch = (leftItem: any, rightItem: any) => {
    if (leftItem.originalIndex === rightItem.originalIndex) {
      // Correct match!
      const newMatched = new Set(matchedPairs);
      newMatched.add(`${leftItem.originalIndex}`);
      setMatchedPairs(newMatched);
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // Wrong match - deselect after a moment
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 800);
    }
  };

  const handleAnswerChange = (value: any) => {
    setUserAnswers({
      ...userAnswers,
      [currentModule.id]: value,
    });
    // Auto-show answer for quiz
    if (currentModule.type === "quiz") {
      setShowAnswer(true);
    }
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const playAudio = (audioUrl: string) => {
    // Stop currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    // Play new audio
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    audio.play();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/lessons/${params.level}`}
              className="text-white/60 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </Link>
            <h1 className="text-xl font-bold text-white">{lessonTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/60 text-sm">
              {currentModuleIndex + 1} / {modules.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex items-center justify-center p-6 ${currentModule?.type === 'pdf' ? 'overflow-hidden' : 'overflow-auto'}`}>
        <div className="w-full max-w-4xl">
          {currentModule && (
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 min-h-[400px] flex flex-col">
              {/* Module Type Badge */}
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                  {currentModule.type === "fillblank" && "Fill in the Blank"}
                  {currentModule.type === "text" && "Text Content"}
                  {currentModule.type === "quiz" && "Quiz"}
                  {currentModule.type === "image" && "Image"}
                  {currentModule.type === "pdf" && "PDF Document"}
                  {currentModule.type === "audio" && "Audio"}
                  {currentModule.type === "matching" && "Matching Exercise"}
                  {currentModule.type === "wordwall" && "Wordwall Activity"}
                  {currentModule.type === "baamboozle" && "Baamboozle"}
                  {currentModule.type === "quizlet" && "Quizlet"}
                  {currentModule.type === "genially" && "Genially"}
                  {currentModule.type === "miro" && "Miro Board"}
                </span>
              </div>

              {/* Module Content */}
              <div className="flex-1">
                {/* Text Module */}
                {currentModule.type === "text" && (
                  <div className="prose prose-lg max-w-none">
                    <p className="text-2xl text-slate-800 leading-relaxed">
                      {currentModule.content.text}
                    </p>
                  </div>
                )}

                {/* Fill in the Blank Module */}
                {currentModule.type === "fillblank" && currentModule.content?.sentence && currentModule.content.sentence.includes("{") && (
                  <div className="relative pb-16">
                    <div className="space-y-6 mb-4">
                      <p className="text-2xl text-slate-800 leading-[3.5rem] mb-8">
                        {currentModule.content.sentence.split("{").map((part: string, i: number) => {
                          if (i === 0) return part;
                          const [blank, rest] = part.split("}");
                          const blankIndex = i - 1;
                          return (
                            <span key={i}>
                              <input
                                type="text"
                                className="inline-block w-32 mx-2 px-3 py-2 border-b-2 border-indigo-500 bg-indigo-50 text-center text-xl font-semibold focus:outline-none focus:border-indigo-700"
                                placeholder="___"
                                value={userAnswers[`${currentModule.id}-${blankIndex}`] || ""}
                                onChange={(e) => {
                                  setUserAnswers({
                                    ...userAnswers,
                                    [`${currentModule.id}-${blankIndex}`]: e.target.value,
                                  });
                                }}
                              />
                              {rest}
                            </span>
                          );
                        })}
                      </p>
                      <button
                        onClick={toggleAnswer}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {showAnswer ? "Hide Answer" : "Show Answer"}
                      </button>
                    </div>
                    {showAnswer && currentModule.content?.answers?.length > 0 && (
                      <div className="absolute bottom-0 left-0 inline-block px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-emerald-800 text-sm font-semibold whitespace-nowrap">
                          Correct Answer: {currentModule.content.answers.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quiz Module */}
                {currentModule.type === "quiz" && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-6 mb-6">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">
                          {currentModule.content.question}
                        </h2>

                        {/* Question Media */}
                        <div className="space-y-4 mb-4">
                          {currentModule.content.questionImageUrl && (
                            <div className="w-full max-w-md h-64 rounded-xl overflow-hidden shadow-lg border-2 border-purple-100">
                              <img
                                src={currentModule.content.questionImageUrl}
                                alt="Question"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {currentModule.content.questionAudioUrl && (
                            <div className="w-full max-w-md bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4 shadow-md">
                              <audio
                                controls
                                className="w-full [&::-webkit-media-controls-panel]:bg-transparent [&::-webkit-media-controls-enclosure]:bg-transparent"
                                style={{
                                  filter: 'hue-rotate(250deg) saturate(1.5)',
                                  height: '40px',
                                  backgroundColor: 'transparent'
                                }}
                              >
                                <source src={currentModule.content.questionAudioUrl} />
                              </audio>
                            </div>
                          )}
                        </div>
                      </div>

                      {showAnswer && userAnswers[currentModule.id] !== undefined && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full ${
                          currentModule.content.options[userAnswers[currentModule.id]]?.isCorrect
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : "bg-red-100 text-red-700 border border-red-300"
                        }`}>
                          {currentModule.content.options[userAnswers[currentModule.id]]?.isCorrect ? "✓ Correct!" : "✗ Wrong"}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {currentModule.content.options.map((option: any, i: number) => {
                        const isSelected = userAnswers[currentModule.id] === i;
                        const isCorrectOption = typeof option === 'string' ? false : option.isCorrect;

                        let buttonClass = "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700";

                        if (showAnswer) {
                          if (isCorrectOption) {
                            buttonClass = "bg-emerald-50 border-emerald-500 text-emerald-800";
                          } else if (isSelected) {
                            buttonClass = "bg-red-50 border-red-500 text-red-800";
                          }
                        } else if (isSelected) {
                          buttonClass = "bg-indigo-50 border-indigo-500 text-indigo-800";
                        }

                        return (
                          <button
                            key={i}
                            onClick={() => handleAnswerChange(i)}
                            className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all ${buttonClass}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center size-6 rounded-full border-2 border-current">
                                {isSelected && (
                                  <span className="size-3 rounded-full bg-current"></span>
                                )}
                              </span>
                              <span className="text-lg font-medium">{typeof option === 'string' ? option : option.text}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Matching Module */}
                {currentModule.type === "matching" && (
                  <div className="relative min-h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-slate-800">
                        Match the pairs - Click one from each side
                      </h2>
                      {/* Progress - Top Right */}
                      {matchedPairs instanceof Set && matchedPairs.size > 0 && (
                        <div className="text-right">
                          <p className="text-lg font-semibold text-emerald-600">
                            {matchedPairs.size} / {currentModule.content.pairs?.length} matched!
                            {matchedPairs.size === currentModule.content.pairs?.length && " 🎉"}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left Column - Shuffled */}
                      <div className="space-y-3">
                        {shuffledLeftItems.map((item: any, i: number) => {
                          const isMatched = matchedPairs instanceof Set ? matchedPairs.has(`${item.originalIndex}`) : false;
                          const isSelected = selectedLeft === i;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleMatchingClick("left", item, i)}
                              disabled={isMatched}
                              className={`w-full p-4 rounded-xl border-2 transition-all h-[120px] flex items-center justify-center ${
                                isMatched
                                  ? "bg-emerald-50 border-emerald-500 opacity-60 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-blue-100 border-blue-500 scale-105 shadow-lg"
                                  : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:scale-102 cursor-pointer"
                              }`}
                            >
                              {item.image ? (
                                <img src={item.image} alt="Left" className="max-h-[90px] max-w-[90%] object-contain" />
                              ) : (
                                <span className="text-lg font-semibold text-slate-800">{item.text}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Column - Shuffled */}
                      <div className="space-y-3">
                        {shuffledRightItems.map((item: any, i: number) => {
                          const isMatched = matchedPairs instanceof Set ? matchedPairs.has(`${item.originalIndex}`) : false;
                          const isSelected = selectedRight === i;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleMatchingClick("right", item, i)}
                              disabled={isMatched}
                              className={`w-full p-4 rounded-xl border-2 transition-all h-[120px] flex items-center justify-center ${
                                isMatched
                                  ? "bg-emerald-50 border-emerald-500 opacity-60 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-purple-100 border-purple-500 scale-105 shadow-lg"
                                  : "bg-purple-50 border-purple-200 hover:border-purple-400 hover:scale-102 cursor-pointer"
                              }`}
                            >
                              {item.image ? (
                                <img src={item.image} alt="Right" className="max-h-[90px] max-w-[90%] object-contain" />
                              ) : (
                                <span className="text-lg font-semibold text-slate-800">{item.text}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio Module */}
                {currentModule.type === "audio" && (
                  <div className="w-full flex items-center justify-center">
                    {currentModule.content.audioItems && currentModule.content.audioItems.length > 0 ? (
                      <div className={`grid gap-8 w-full ${
                        currentModule.content.audioItems.length === 1
                          ? "grid-cols-1 max-w-md"
                          : currentModule.content.audioItems.length === 2
                          ? "grid-cols-2 max-w-2xl"
                          : currentModule.content.audioItems.length === 3
                          ? "grid-cols-3 max-w-4xl"
                          : "grid-cols-2 md:grid-cols-4 max-w-5xl"
                      }`}>
                        {currentModule.content.audioItems.map((item: AudioItem) => (
                          <div key={item.id} className="flex flex-col items-center">
                            <button
                              onClick={() => playAudio(item.audioUrl)}
                              className={`rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 flex items-center justify-center mb-4 transition-all shadow-lg hover:shadow-xl ${
                                currentModule.content.audioItems.length === 1
                                  ? "size-40"
                                  : currentModule.content.audioItems.length === 2
                                  ? "size-32"
                                  : "size-24"
                              }`}
                            >
                              <span className={`material-symbols-outlined text-white ${
                                currentModule.content.audioItems.length === 1
                                  ? "text-7xl"
                                  : currentModule.content.audioItems.length === 2
                                  ? "text-6xl"
                                  : "text-5xl"
                              }`}>
                                volume_up
                              </span>
                            </button>
                            {item.title && (
                              <p className={`font-semibold text-slate-800 text-center ${
                                currentModule.content.audioItems.length === 1
                                  ? "text-3xl"
                                  : currentModule.content.audioItems.length === 2
                                  ? "text-2xl"
                                  : "text-xl"
                              }`}>{item.title}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="size-24 rounded-full bg-slate-100 flex items-center justify-center mb-4 mx-auto">
                          <span className="material-symbols-outlined text-5xl text-slate-400">
                            volume_up
                          </span>
                        </div>
                        <p className="text-slate-500">No audio items added</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Module */}
                {currentModule.type === "image" && (
                  <div className="w-full flex items-center justify-center">
                    {currentModule.content.imageItems && currentModule.content.imageItems.length > 0 ? (
                      <div className={`grid gap-8 w-full ${
                        currentModule.content.imageItems.length === 1
                          ? "grid-cols-1 max-w-xl"
                          : currentModule.content.imageItems.length === 2
                          ? "grid-cols-2 max-w-3xl"
                          : currentModule.content.imageItems.length === 3
                          ? "grid-cols-3 max-w-5xl"
                          : "grid-cols-2 md:grid-cols-4"
                      }`}>
                        {currentModule.content.imageItems.map((item: ImageItem) => (
                          <div key={item.id} className="flex flex-col items-center">
                            <div className={`w-full aspect-square rounded-xl overflow-hidden bg-slate-100 mb-3 shadow-lg ${
                              currentModule.content.imageItems.length === 1
                                ? "max-h-96"
                                : ""
                            }`}>
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.caption || "Image"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-6xl text-slate-400">image</span>
                                </div>
                              )}
                            </div>
                            {item.caption && (
                              <p className={`font-semibold text-slate-800 text-center ${
                                currentModule.content.imageItems.length === 1
                                  ? "text-3xl"
                                  : currentModule.content.imageItems.length === 2
                                  ? "text-2xl"
                                  : "text-xl"
                              }`}>{item.caption}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-full h-96 bg-slate-100 rounded-xl flex items-center justify-center">
                          <div className="text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
                              image
                            </span>
                            <p className="text-slate-500">No images added</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PDF Module */}
                {currentModule.type === "pdf" && (
                  <div className="w-full h-[700px]">
                    {currentModule.content.pdfUrl ? (
                      <iframe
                        src={currentModule.content.pdfUrl}
                        className="w-full h-full rounded-xl border border-slate-200"
                        title={currentModule.content.pdfName || "PDF Document"}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
                            picture_as_pdf
                          </span>
                          <p className="text-slate-500">No PDF uploaded</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Wordwall Module */}
                {currentModule.type === "wordwall" && currentModule.content?.wordwallIframe && (
                  <div className="flex items-center justify-center w-full">
                    <div className="w-full max-w-3xl h-[600px]">
                      <div
                        className="w-full h-full flex items-center justify-center"
                        dangerouslySetInnerHTML={{
                          __html: currentModule.content.wordwallIframe
                            .replace(/width="[^"]*"/g, 'width="100%"')
                            .replace(/height="[^"]*"/g, 'height="100%"')
                            .replace(/style="[^"]*"/g, 'style="width:100%;height:100%"')
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Baamboozle Module */}
                {currentModule.type === "baamboozle" && currentModule.content?.baamboozleUrl && (
                  <div className="flex items-center justify-center w-full">
                    <div className="w-full max-w-2xl">
                      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="size-20 mx-auto mb-6 bg-pink-100 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-pink-600">casino</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-3">Baamboozle Activity</h3>
                        <p className="text-slate-600 mb-6">Click the button below to open the activity in a new tab</p>
                        <a
                          href={currentModule.content.baamboozleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-8 py-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-lg transition-colors"
                        >
                          <span className="material-symbols-outlined">open_in_new</span>
                          Open Baamboozle
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quizlet Module */}
                {currentModule.type === "quizlet" && currentModule.content?.quizletIframe && (
                  <div className="flex items-center justify-center w-full">
                    <div className="w-full max-w-3xl h-[600px]">
                      <div
                        className="w-full h-full flex items-center justify-center [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:rounded-xl"
                        dangerouslySetInnerHTML={{
                          __html: currentModule.content.quizletIframe
                            .replace(/width="[^"]*"/g, 'width="100%"')
                            .replace(/height="[^"]*"/g, 'height="100%"')
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Genially Module */}
                {currentModule.type === "genially" && currentModule.content?.geniallyUrl && (
                  <div className="flex items-center justify-center w-full">
                    <div className="w-full max-w-4xl h-[600px]">
                      <iframe
                        src={currentModule.content.geniallyUrl}
                        className="w-full h-full rounded-xl border-0"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* Miro Module */}
                {currentModule.type === "miro" && currentModule.content?.miroUrl && (
                  <div className="flex items-center justify-center w-full">
                    <div className="w-full max-w-5xl h-[600px]">
                      <iframe
                        src={(() => {
                          const url = currentModule.content.miroUrl;
                          // Convert board URL to live-embed format
                          if (url.includes('/live-embed/')) return url;
                          if (url.includes('/app/board/')) {
                            return url.replace('/app/board/', '/app/live-embed/');
                          }
                          return url;
                        })()}
                        className="w-full h-full rounded-xl border-0"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex-shrink-0 bg-black/20 backdrop-blur-sm border-t border-white/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={goToPrevious}
            disabled={isFirstModule}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Previous</span>
          </button>

          {/* Module Dots */}
          <div className="flex items-center gap-2">
            {modules.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentModuleIndex(index);
                  setShowAnswer(false);
                }}
                className={`size-2 rounded-full transition-all ${
                  index === currentModuleIndex
                    ? "bg-white w-6"
                    : "bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            disabled={isLastModule}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
