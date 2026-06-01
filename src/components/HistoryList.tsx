import React from "react";
import { History, Trash2, ArrowRight, Play, X } from "lucide-react";
import { DownloadHistory } from "../types";

interface HistoryListProps {
  history: DownloadHistory[];
  onSelect: (url: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function HistoryList({ history, onSelect, onRemove, onClear }: HistoryListProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="w-full rounded-[2rem] glass-card p-5 md:p-6 mt-8">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-tiktok-cyan" />
          <h2 className="font-display text-sm font-bold text-white">Riwayat Unduhan</h2>
          <span className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs text-white/60 font-bold">
            {history.length}
          </span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition duration-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Hapus Semua</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[360px] overflow-y-auto pr-1">
        {history.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-3 hover:border-white/15 transition duration-300"
          >
            {/* Remove button */}
            <button
              onClick={() => onRemove(item.id)}
              className="absolute top-2.5 right-2.5 z-10 hidden group-hover:flex items-center justify-center h-6 w-6 rounded-full bg-black/80 text-white/60 hover:text-white hover:bg-red-500/20 border border-white/10 transition duration-200"
              title="Hapus dari riwayat"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div>
              {/* Cover view */}
              <div 
                onClick={() => onSelect(item.url)}
                className="relative overflow-hidden aspect-video rounded-xl bg-black cursor-pointer mb-3 group/cover"
              >
                <img
                  src={item.cover}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover/cover:scale-105 transition duration-300 opacity-90"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition duration-200">
                  <Play className="h-8 w-8 text-tiktok-cyan fill-tiktok-cyan drop-shadow-md" />
                </div>
              </div>

              {/* Title & Author snippet */}
              <div className="px-1">
                <p className="text-xs font-bold text-zinc-100 line-clamp-2 min-h-[2.2rem] leading-snug">
                  {item.title || "Video TikTok Tanpa Judul"}
                </p>
                
                <div className="flex items-center gap-2 mt-3">
                  <img
                    src={item.avatar}
                    alt={item.authorName}
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-full object-cover border border-white/10"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] text-white/80 truncate font-bold leading-none">
                      {item.authorName}
                    </p>
                    <p className="text-[9px] text-white/40 truncate font-mono mt-0.5">
                      @{item.authorUsername}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Select/Download details trigger button */}
            <button
              onClick={() => onSelect(item.url)}
              className="mt-4 flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-left text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 border border-white/5 transition duration-200"
            >
              <span>Download Ulang</span>
              <ArrowRight className="h-3.5 w-3.5 text-tiktok-cyan" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
