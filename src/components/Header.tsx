import React from "react";
import { Download, Film, Zap } from "lucide-react";

export function Header() {
  return (
    <header className="relative w-full border-b border-white/5 bg-white/5 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b0e14] border border-white/10 shadow-lg group overflow-hidden">
              {/* Highlight Cyan & Pink glow shadows backing */}
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-tiktok-cyan to-tiktok-pink opacity-20 blur-sm transition duration-300 group-hover:opacity-75"></div>
              <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-zinc-950 overflow-hidden">
                <img 
                  src="/logo.jpg" 
                  alt="Retendoro Logo" 
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            
            <div>
              <h1 className="font-display text-xl font-black tracking-tight text-white flex items-center gap-1">
                <span>RETEN</span>
                <span className="text-tiktok-cyan">DORO</span>
              </h1>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest leading-none mt-0.5">Instant HD Media Downloader</p>
            </div>
          </div>

          {/* Quick Metrics / Subtitle */}
          <div className="flex items-center gap-3 text-xs font-bold text-white/70">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Zap className="h-3.5 w-3.5 text-tiktok-cyan animate-pulse" />
              <span>SUPER FAST CDN</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Download className="h-3.5 w-3.5 text-tiktok-pink" />
              <span>UNLIMITED DOWNLOADS</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

