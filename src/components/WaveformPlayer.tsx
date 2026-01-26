"use client";

import { useEffect, useRef, useState } from "react";

interface WaveformPlayerProps {
  audioUrl: string;
  title?: string;
}

export default function WaveformPlayer({ audioUrl, title }: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    const newTime = (percent / 100) * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percent);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div>
      {title && (
        <p className="text-sm font-semibold text-slate-700 mb-2">{title}</p>
      )}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className={`flex-shrink-0 size-11 rounded-full ${
              isPlaying ? "bg-blue-600" : "bg-blue-500 hover:bg-blue-600"
            } flex items-center justify-center transition-colors shadow-md`}
          >
            <span className="material-symbols-outlined text-white text-2xl">
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>

          {/* Time Display */}
          <div className="flex-shrink-0 text-xs text-slate-500 font-medium w-[70px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Progress Bar */}
          <div
            className="flex-1 h-2 bg-slate-200 rounded-full cursor-pointer relative group"
            onClick={handleSeek}
          >
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 size-3.5 bg-white rounded-full shadow border-2 border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>

          {/* Volume Icon */}
          <div className="flex-shrink-0">
            <span className={`material-symbols-outlined text-xl ${isPlaying ? 'text-blue-500' : 'text-blue-400'}`}>
              volume_up
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
