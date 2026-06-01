import React, { useState, useEffect, useRef } from "react";
import { 
  Clipboard, 
  HelpCircle, 
  Loader2, 
  Play, 
  Check, 
  AlertCircle,
  Video,
  Sparkles,
  RefreshCw,
  Search,
  Instagram,
  Youtube
} from "lucide-react";
import { Header } from "./components/Header";
import { ManualUsage } from "./components/ManualUsage";
import { VideoResult } from "./components/VideoResult";
import { HistoryList } from "./components/HistoryList";
import { TikTokVideoInfo, DownloadHistory } from "./types";

const TIKTOK_URL_REGEX = /^(https?:\/\/)?(www\.|vt\.|vm\.|v\.)?tiktok\.com\/[a-zA-Z0-9_@.\-\/]+/i;
const INSTAGRAM_URL_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/[a-zA-Z0-9_\-]+/i;
const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/[a-zA-Z0-9_@.\-\/]+/i;

export default function App() {
  const [inputUrl, setInputUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [history, setHistory] = useState<DownloadHistory[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"tiktok" | "instagram" | "youtube">("tiktok");
  const previousProcessedUrl = useRef<string>("");

  // Load download history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tik_saver_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }, []);

  // Save download history when it changes
  const saveHistory = (newHistory: DownloadHistory[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("tik_saver_history", JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };

  // Add search/download item to local history
  const addToHistory = (info: TikTokVideoInfo, url: string, platform: "tiktok" | "instagram" | "youtube" = "tiktok") => {
    const newEntry: DownloadHistory = {
      id: info.id || String(Date.now()),
      url: url,
      title: info.title || (platform === "instagram" ? "Video Instagram Tanpa Judul" : platform === "youtube" ? "Video YouTube Tanpa Judul" : "Video TikTok Tanpa Judul"),
      authorName: info.author?.nickname || (platform === "instagram" ? "Kreator Instagram" : platform === "youtube" ? "Uploader YouTube" : "Kreator TikTok"),
      authorUsername: info.author?.unique_id || platform,
      avatar: info.author?.avatar || "",
      cover: info.cover || "",
      downloadedAt: new Date().toISOString()
    };

    // Filter out item with duplicated video ID
    const baseList = history.filter(item => item.id !== newEntry.id);
    const updatedHistory = [newEntry, ...baseList].slice(0, 12); // Limit history size to 12
    saveHistory(updatedHistory);
  };

  // Main social fetch worker function
  const handleFetchVideo = async (urlToFetch: string) => {
    const trimmedUrl = urlToFetch.trim();
    if (!trimmedUrl) return;

    const isIg = INSTAGRAM_URL_REGEX.test(trimmedUrl);
    const isTt = TIKTOK_URL_REGEX.test(trimmedUrl);
    const isYt = YOUTUBE_URL_REGEX.test(trimmedUrl);

    if (!isIg && !isTt && !isYt) {
      setErrorMsg("Format tautan tidak dikenal. Pastikan menggunakan tautan video TikTok, Instagram, atau YouTube asli yang valid.");
      return;
    }

    const detectedPlatform = isIg ? "instagram" : (isYt ? "youtube" : "tiktok");
    setActiveTab(detectedPlatform);

    setIsLoading(true);
    setErrorMsg(null);
    setVideoInfo(null);
    previousProcessedUrl.current = trimmedUrl;

    try {
      let apiEndpoint = "/api/tiktok/info";
      if (detectedPlatform === "instagram") {
        apiEndpoint = "/api/instagram/info";
      } else if (detectedPlatform === "youtube") {
        apiEndpoint = "/api/youtube/info";
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: trimmedUrl })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || `Gagal memperoleh data video dari server ${detectedPlatform}.`);
      }

      setVideoInfo(resData.data);
      addToHistory(resData.data, trimmedUrl, detectedPlatform);
    } catch (err: any) {
      console.error("Fetch media error:", err);
      setErrorMsg(err.message || `Gagal memproses video ${detectedPlatform}. Periksa koneksi internet atau coba link lain.`);
    } finally {
      setIsLoading(false);
    }
  };

  // "Otomatis menampilkan" - Automatic trigger on paste or link change detection
  useEffect(() => {
    const trimmed = inputUrl.trim();
    const isTt = TIKTOK_URL_REGEX.test(trimmed);
    const isIg = INSTAGRAM_URL_REGEX.test(trimmed);

    // Only auto-trigger if it looks like a valid URL and we haven't already processed it just before
    if (trimmed && (isTt || isIg) && trimmed !== previousProcessedUrl.current) {
      // Small debounce to let copy-paste streams commit cleanly
      const delayTimer = setTimeout(() => {
        handleFetchVideo(trimmed);
      }, 350);
      return () => clearTimeout(delayTimer);
    }
  }, [inputUrl]);

  // Click paste handler from clipboard API
  const handlePasteFromClipboard = async () => {
    try {
      setErrorMsg(null);
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
      }
    } catch (err) {
      // Fallback message if clipboard permissions aren't fully unblocked in iframe
      setErrorMsg("Tidak dapat mengakses clipboard secara otomatis. Silakan tempel (Ctrl+V / Tap lama) secara manual.");
    }
  };

  // Re-fetch item selection from History list
  const handleSelectFromHistory = (itemUrl: string) => {
    setInputUrl(itemUrl);
    handleFetchVideo(itemUrl);
  };

  // Removal criteria
  const handleRemoveHistoryItem = (id: string) => {
    const filtered = history.filter(item => item.id !== id);
    saveHistory(filtered);
  };

  // Clear criteria
  const handleClearHistory = () => {
    saveHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-zinc-100 font-sans selection:bg-tiktok-pink selection:text-white pb-16 relative overflow-x-hidden">
      
      {/* Frosted Glass Theme Mesh Background with Slow Animated RGB Flow */}
      <div className="mesh-bg">
        <div className="glow-blob blob-cyan"></div>
        <div className="glow-blob blob-pink"></div>
        <div className="glow-blob blob-purple"></div>
        <div className="glow-blob blob-yellow"></div>
        
        {/* Large watermark background of Retendoro logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none mix-blend-screen overflow-hidden">
          <img 
            src="/logo.jpg" 
            alt="Watermark background" 
            className="w-[120%] max-w-4xl h-auto object-contain scale-110 md:scale-100"
            style={{ filter: "invert(1) contrast(1.1) brightness(0.8)" }}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          
          {/* Main Search & Hero Panel Container */}
          <div className="max-w-2xl mx-auto text-center mb-10 mt-2 sm:mt-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/80 font-medium mb-4 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-tiktok-cyan animate-pulse" />
              <span>Full-Speed HD Downloader</span>
            </span>
            
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Multi-Platform Downloader <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-tiktok-cyan via-white to-tiktok-pink bg-clip-text text-transparent">
                TikTok, IG & YouTube HD
              </span>
            </h2>
            
            <p className="text-white/60 text-sm mt-3.5 max-w-lg mx-auto font-medium">
              Unduh media TikTok (tanpa watermark), Instagram Reels, dan YouTube Video/Shorts/Audio beresolusi tinggi secara gratis. Cukup masukkan link media Anda!
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Input Action Form Block */}
            <div className="glass-card p-5 md:p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
              
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-tiktok-cyan via-tiktok-purple to-tiktok-pink"></div>

              <div className="space-y-4">
                
                {/* Dynamic Tab Switchers */}
                <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5 mb-5 max-w-[380px] mx-auto sm:mx-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("tiktok");
                      setErrorMsg(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                      activeTab === "tiktok"
                        ? "bg-white text-black shadow-md font-extrabold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Play className={`h-3 w-3 ${activeTab === "tiktok" ? "fill-black text-black" : "text-white/40"}`} />
                    <span>TikTok</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("instagram");
                      setErrorMsg(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition duration-300 cursor-pointer ${
                      activeTab === "instagram"
                        ? "bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-500 text-white shadow-md font-black"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Instagram className={`h-3.5 w-3.5 ${activeTab === "instagram" ? "text-white" : "text-white/40"}`} />
                    <span>Instagram</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("youtube");
                      setErrorMsg(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                      activeTab === "youtube"
                        ? "bg-red-600 text-white shadow-md font-extrabold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Youtube className={`h-3.5 w-3.5 ${activeTab === "youtube" ? "text-white" : "text-white/40"}`} />
                    <span>YouTube</span>
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <label className="block text-left text-xs font-bold uppercase tracking-wider text-white/50">
                    {activeTab === "instagram" ? "Tempel Tautan Instagram Video / Reels" : activeTab === "youtube" ? "Tempel Tautan YouTube Video / Shorts" : "Tempel Tautan TikTok Video"}
                  </label>
                  <div className="flex gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    <span>Server: SG-01 (Active)</span>
                  </div>
                </div>

                <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-zinc-500" />
                    </div>
                    
                    <input
                      type="url"
                      placeholder={activeTab === "instagram" 
                        ? "https://www.instagram.com/reel/CXYZ/ atau https://www.instagram.com/p/..." 
                        : activeTab === "youtube"
                        ? "https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                        : "https://vt.tiktok.com/ZSxW3BcbJ/ atau https://www.tiktok.com/..."}
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      disabled={isLoading}
                      className="w-full input-glass rounded-2xl py-3.5 pl-11 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-tiktok-cyan/40 placeholder-white/30 font-sans"
                    />

                    {/* Integrated smart quick buttons (Paste & Clear) */}
                    <div className="absolute inset-y-2 right-2 flex items-center gap-1.5">
                      {inputUrl ? (
                         <button
                           type="button"
                           onClick={() => setInputUrl("")}
                           disabled={isLoading}
                           className="px-2.5 py-1.5 text-xs text-white/60 hover:text-white rounded-xl bg-white/5 border border-white/10 transition cursor-pointer"
                         >
                           Reset
                         </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePasteFromClipboard}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition duration-150 cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-tiktok-cyan" />
                              <span className="text-tiktok-cyan">Ditempel!</span>
                            </>
                          ) : (
                            <>
                              <Clipboard className="h-3.5 w-3.5 text-tiktok-cyan" />
                              <span>Tempel</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleFetchVideo(inputUrl)}
                    disabled={isLoading || !inputUrl.trim()}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-tiktok-cyan text-black font-black uppercase tracking-tighter text-xs px-8 py-3.5 sm:py-auto transition duration-300 disabled:opacity-40 disabled:cursor-not-allowed text-center shrink-0 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Menganalisis...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        <span>Fetch Video</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-white/40 flex items-center gap-1.5 mt-2 text-left font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-tiktok-cyan inline-block animate-ping"></span>
                  <span><strong>Otomatis:</strong> Video akan otomatis ditampilkan seketika link {activeTab === "instagram" ? "Instagram" : activeTab === "youtube" ? "YouTube" : "TikTok"} disalin kesini.</span>
                </p>
              </div>

              {/* Error feedback container */}
              {errorMsg && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-red-950/20 border border-red-500/20 p-4 text-left text-red-100 backdrop-blur-md">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-red-300">Gagal Pemrosesan</p>
                    <p className="text-red-200/90 mt-0.5 leading-relaxed">{errorMsg}</p>
                    {errorMsg.includes("valid") && (
                      <p className="text-red-400/80 mt-1 italic font-semibold">
                        {activeTab === "instagram" 
                          ? "Contoh link valid: https://www.instagram.com/reel/CXYZ/ atau https://www.instagram.com/p/..."
                          : activeTab === "youtube"
                          ? "Contoh link valid: https://www.youtube.com/watch?v=dQw4w9WgXcQ atau https://youtu.be/dQw4w9WgXcQ"
                          : "Contoh link valid: https://vt.tiktok.com/ZSxW3BcbJ/ atau https://www.tiktok.com/@username/video/..."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Loader placeholder while searching */}
              {isLoading && (
                <div className="mt-6 flex flex-col items-center justify-center p-8 bg-black/30 rounded-2xl border border-white/5 space-y-3.5">
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-tiktok-cyan animate-spin" />
                    <Video className="absolute h-3.5 w-3.5 text-tiktok-pink animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-white/90">Menghubungkan ke Server {activeTab === "instagram" ? "Instagram" : activeTab === "youtube" ? "YouTube" : "TikTok"}...</p>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {activeTab === "instagram" 
                        ? "Metode pemrosesan video original instagram sedang dipersiapkan"
                        : activeTab === "youtube"
                        ? "Menghubungkan ke API YouTube oEmbed dan mempersiapkan stream server"
                        : "Metode pencarian HD, SD, Audio dan Informasi Musik sedang disiapkan"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Display Video Info Panel if payload retrieved */}
            {videoInfo && !isLoading && (
              <VideoResult info={videoInfo} platform={activeTab} />
            )}

            {/* Step instructions */}
            {!videoInfo && !isLoading && (
              <ManualUsage platform={activeTab} />
            )}

            {/* Offline-first History log */}
            <HistoryList
              history={history}
              onSelect={handleSelectFromHistory}
              onRemove={handleRemoveHistoryItem}
              onClear={handleClearHistory}
            />

          </div>

        </main>
      </div>

      {/* Footer Branding credits */}
      <footer className="mt-auto border-t border-white/5 pt-8 text-center text-xs text-white/30 relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© 2026 TikSaver HD Downloader Premium. Semua hak dilindungi.</p>
          <p className="mt-1 text-[10px] text-zinc-700 font-mono">
            Website ini tidak berafiliasi resmi dengan ByteDance atau TikTok.
          </p>
        </div>
      </footer>

    </div>
  );
}
