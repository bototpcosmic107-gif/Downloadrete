import React, { useState } from "react";
import { 
  Download, 
  HelpCircle, 
  Music, 
  CheckCircle, 
  Sparkles,
  FileVideo,
  Disc3,
  ExternalLink
} from "lucide-react";
import { TikTokVideoInfo } from "../types";

interface VideoResultProps {
  info: TikTokVideoInfo;
  onDownloadStart?: () => void;
  platform?: "tiktok" | "instagram" | "youtube";
}

export function VideoResult({ info, onDownloadStart, platform = "tiktok" }: VideoResultProps) {
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  // Helper to format bytes to megabytes
  const formatBytes = (bytes?: number) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return `~${mb.toFixed(2)} MB`;
  };

  // Safe filename generator based on title and author
  const getSafeFilename = (ext: string, suffix: string = "no-watermark") => {
    const authorStr = info.author?.unique_id || "media";
    const videoId = info.id || "video";
    const cleanedTitle = (info.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 30);
    return `${authorStr}_${cleanedTitle}_${suffix}_${videoId}.${ext}`;
  };

  const handleDownload = async (directUrl: string, type: string, filename: string) => {
    try {
      setDownloadingType(type);
      if (onDownloadStart) onDownloadStart();

      let targetStreamUrl = directUrl;

      // YouTube demands remote stream url parsing via Cobalt first!
      if (platform === "youtube") {
        const isAudioOnly = type === "audio";
        const qualityVal = type === "hd" ? "1080" : "720";

        const resolveResponse = await fetch("/api/youtube/download-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: directUrl, // original youtube URL stored in play (or info.play)
            quality: qualityVal,
            isAudioOnly: isAudioOnly
          })
        });

        if (!resolveResponse.ok) {
          throw new Error("Gagal memproses link unduh YouTube. Silakan klik lagi dalam beberapa saat.");
        }

        const resolveData = await resolveResponse.json();
        if (!resolveData.success || !resolveData.downloadUrl) {
          throw new Error(resolveData.error || "Gagal memperoleh stream unduhan YouTube");
        }

        targetStreamUrl = resolveData.downloadUrl;
      }

      const proxyBase = platform === "instagram" 
        ? "/api/instagram/download" 
        : (platform === "youtube" ? "/api/youtube/download" : "/api/tiktok/download");
        
      // Create proxy url to download through local server
      const proxyUrl = `${proxyBase}?url=${encodeURIComponent(targetStreamUrl)}&filename=${encodeURIComponent(filename)}`;
      
      // 1. Fetch the file directly as a blob. This is the most bulletproof way to download 
      // files on modern browsers, bypassing iframe restrictions and preventing preview/player redirects.
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 2. Trigger native download via localized blob
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up local reference
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error("Gagal mendownload via Blob, mencoba fallback direct-link:", err);
      // Fallback: If fetch is blocked, directly navigate or trigger direct download
      const proxyBase = platform === "instagram" 
        ? "/api/instagram/download" 
        : (platform === "youtube" ? "/api/youtube/download" : "/api/tiktok/download");
      const proxyUrl = `${proxyBase}?url=${encodeURIComponent(directUrl)}&filename=${encodeURIComponent(filename)}`;
      window.location.href = proxyUrl;
    } finally {
      setDownloadingType(null);
    }
  };

  const isInstagram = platform === "instagram";
  const isYoutube = platform === "youtube";
  const profileUrl = isInstagram 
    ? `https://www.instagram.com/${info.author?.unique_id}/`
    : (isYoutube ? `https://www.youtube.com/${info.author?.unique_id}` : `https://www.tiktok.com/@${info.author?.unique_id}`);

  return (
    <div className="w-full rounded-[2rem] glass-card p-5 md:p-8 shadow-2xl relative overflow-hidden">
      {/* Absolute ambient light effect */}
      <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-tiktok-cyan/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-tiktok-pink/10 blur-3xl pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row gap-8 relative z-10">
        
        {/* Left Column: Video Preview Stream */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="relative aspect-[9/16] max-h-[540px] mx-auto w-full rounded-2xl border border-white/10 bg-black overflow-hidden shadow-xl group">
            {/* Play video element natively or YouTube embed */}
            {isYoutube ? (
              <iframe
                src={`https://www.youtube.com/embed/${info.id}?autoplay=0&rel=0`}
                className="w-full h-full object-cover rounded-2xl border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="Pratinjau Video YouTube"
              />
            ) : (
              <video
                src={info.play}
                poster={info.cover}
                controls
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
              />
            )}
            {/* Custom high contrast badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-sm text-[10px] font-bold text-tiktok-cyan border border-white/10">
              <CheckCircle className="h-3 w-3 fill-tiktok-cyan text-zinc-950" />
              <span>Pratinjau Video {isInstagram ? "Instagram" : isYoutube ? "YouTube" : "TikTok"}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Information, Statistics & Download Opsi */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            
            {/* Elegant Media Details Panel - Requested Field representation */}
            <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-5 mb-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-[10px] font-bold tracking-widest text-tiktok-cyan uppercase flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-tiktok-cyan" />
                  <span>Detail Media {isInstagram ? "Instagram" : isYoutube ? "YouTube" : "TikTok"}</span>
                </span>
                <span className="text-[10px] font-mono text-white/30 lowercase">source: {platform}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* 1. Foto Akun */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-[10px] text-white/45 font-bold uppercase tracking-wider scale-90">Foto Akun</span>
                  <img
                    src={info.author?.avatar || "placeholder.jpeg"}
                    alt={info.author?.nickname || "avatar"}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 rounded-full object-cover border-2 border-tiktok-cyan/40 bg-zinc-900 shadow-md ring-4 ring-white/5"
                  />
                </div>

                {/* Account Details Specs */}
                <div className="flex-1 w-full space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-white/80">
                    {/* 2. Nama Akun */}
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Nama Akun</span>
                      <span className="font-display text-sm font-black text-white">{info.author?.nickname || "-"}</span>
                    </div>

                    {/* 3. Username */}
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Username</span>
                      <span className="font-mono text-sm text-tiktok-pink font-extrabold">@{info.author?.unique_id || "-"}</span>
                    </div>

                    {/* 4. Link mengarahkan ke profil */}
                    <div className="sm:col-span-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-wider text-[9px] block mb-1">Link Profil</span>
                      <a 
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-tiktok-cyan hover:underline hover:text-white font-black truncate max-w-full"
                      >
                        <span className="truncate">{profileUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-tiktok-cyan animate-pulse" />
                      </a>
                    </div>

                    {/* 5. Nama music */}
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Nama Musik</span>
                      <span className="font-sans text-xs text-white/95 font-semibold flex items-center gap-1">
                        <Music className="h-3.5 w-3.5 text-tiktok-pink shrink-0 shrink-0" />
                        <span className="truncate">{info.music_info?.title ? `${info.music_info.title} - ${info.music_info.author}` : (isInstagram ? "Audio Utama Post" : "Original Sound")}</span>
                      </span>
                    </div>

                    {/* 6. Durasi */}
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                       <span className="text-white/40 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Durasi</span>
                       <span className="font-mono text-xs text-zinc-100 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md inline-block font-bold">
                         {isInstagram ? "Video Reels" : isYoutube ? "Standard Video" : `${info.duration} detik`}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Caption / Title */}
            <div className="py-2.5 mb-5">
              <h4 className="text-xs font-bold tracking-widest text-[#00f2ea] uppercase mb-2">Keterangan / Kapsi</h4>
              <p className="text-sm leading-relaxed text-white whitespace-pre-line bg-black/25 border border-white/5 rounded-2xl p-4 font-medium">
                {info.title || (
                  <span className="text-white/30 italic">Tidak ada keterangan deskripsi video.</span>
                )}
              </p>
            </div>

            {/* Download Options Panel */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold tracking-widest text-[#ff0050] uppercase">
                {isInstagram ? "Pilihan Download Video Instagram" : isYoutube ? "Pilihan Download Video YouTube" : "Pilih Opsi Kualitas Download"}
              </h4>
              
              <div className="text-xs font-semibold text-white/80 bg-black/40 border border-white/5 px-4.5 py-3 rounded-2xl">
                Download Vidio Anda Dengan Kualitas Terbaik. WM = Watermark
              </div>

              {/* 1020P Option, no watermark */}
              <button
                onClick={() => handleDownload(
                  info.play, 
                  "hd", 
                  getSafeFilename("mp4", isInstagram ? "instagram-1020p" : isYoutube ? "youtube-1020p" : "HD-no-watermark")
                )}
                disabled={downloadingType !== null}
                className="relative overflow-hidden w-full group flex items-center justify-between rounded-2xl bg-white text-black hover:bg-tiktok-cyan font-black text-sm px-5 py-4 transition duration-300 disabled:opacity-50 shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/10">
                    <Sparkles className="h-4 w-4 text-black animate-pulse" />
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold flex items-center gap-1.5 leading-none tracking-tight">
                      <span>{downloadingType === "hd" ? "MENGUNDUH VIDEO 1020P..." : "(DOWNLOAD VIDIO 1020P) Tanpa WM"}</span>
                    </p>
                    <p className="text-[10px] text-black/60 font-bold uppercase mt-1">Kualitas maksimal terbaik tanpa logo watermark</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10 font-bold">
                  <span className="text-[10px] font-mono text-black bg-black/5 px-2 py-0.5 rounded-full">
                    {isInstagram ? "1020p HD" : isYoutube ? "1080p HD" : (info.hdplay ? (info.hd_size ? formatBytes(info.hd_size) : "1080p") : (info.size ? formatBytes(info.size) : "1020p"))}
                  </span>
                  <Download className={`h-5 w-5 ${downloadingType === "hd" ? "animate-bounce" : "group-hover:translate-y-0.5 transition"}`} />
                </div>
              </button>

              {/* 720P Option, no watermark */}
              <button
                onClick={() => handleDownload(
                  info.play, 
                  "sd", 
                  getSafeFilename("mp4", isInstagram ? "instagram-720p" : isYoutube ? "youtube-720p" : "SD-no-watermark")
                )}
                disabled={downloadingType !== null}
                className="w-full group flex items-center justify-between rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white font-extrabold text-sm px-5 py-3.5 transition duration-200 disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                    <FileVideo className="h-4 w-4 text-zinc-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white leading-none">
                      {downloadingType === "sd" ? "MENGUNDUH VIDEO 720P..." : "(DOWNLOAD VIDIO 720P) Tanpa WM"}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Ukuran file lebih hemat & stabil tanpa watermark</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/60 bg-black/20 px-2 py-0.5 rounded-full border border-white/5">
                    {isInstagram ? "720p" : isYoutube ? "720p HD" : (formatBytes(info.size || 0) || "720p")}
                  </span>
                  <Download className={`h-4 w-4 text-white/60 ${downloadingType === "sd" ? "animate-bounce" : "group-hover:translate-y-0.5 transition"}`} />
                </div>
              </button>

              {/* Music/Audio extraction option */}
              <button
                onClick={() => handleDownload(
                  info.play, 
                  "audio", 
                  getSafeFilename("mp3", isYoutube ? "youtube-music" : "audio")
                )}
                disabled={downloadingType !== null}
                className="w-full group flex items-center justify-between rounded-2xl bg-[#ff0050]/10 hover:bg-[#ff0050]/20 border border-[#ff0050]/20 text-white font-bold text-sm px-5 py-4 transition duration-200 disabled:opacity-50 shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-tiktok-pink/20 border border-tiktok-pink/30 animate-spin-slow">
                    <Disc3 className="h-4 w-4 text-tiktok-pink animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <div className="text-left min-w-0 max-w-[200px] sm:max-w-[300px]">
                    <p className="font-bold text-white flex items-center gap-1 leading-none uppercase tracking-tight">
                      <Music className="h-3.5 w-3.5 text-tiktok-pink shrink-0" />
                      <span className="truncate text-xs">
                        {downloadingType === "audio" ? "MENGEKSTRAK AUDIO (MP3)..." : "(DOWNLOAD MUSIC)"}
                      </span>
                    </p>
                    <p className="text-[10px] text-white/40 truncate mt-1 italic font-medium">
                      {info.music_info?.title || (isInstagram ? "Instagram Audio" : isYoutube ? `${info.title} Audio` : "Original Sound")} - {info.music_info?.author || info.author?.nickname || "Kreator"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#ff0050]/20 border border-[#ff0050]/30 text-tiktok-pink text-[9px] px-2.5 py-0.5 rounded-full uppercase font-black">
                    MP3
                  </span>
                  <Download className={`h-4 w-4 text-tiktok-pink ${downloadingType === "audio" ? "animate-bounce" : "group-hover:translate-y-0.5 transition"}`} />
                </div>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-white/45 flex flex-wrap gap-4 justify-between items-center bg-black/10 p-3.5 rounded-2xl">
            <span>Media ID: <span className="font-mono text-white/60">{info.id}</span></span>
            <span>Duration: <span className="font-mono text-white/60">{isInstagram ? "Standard Video" : isYoutube ? "Standard Video" : `${info.duration} detik`}</span></span>
            <span>CDN Network: <span className="font-bold text-tiktok-cyan uppercase">Active G-Core</span></span>
          </div>

        </div>

      </div>
    </div>
  );
}
