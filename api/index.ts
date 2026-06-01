import express from "express";
import { Readable } from "stream";
import dns from "dns";
import { instagramGetUrl } from "instagram-url-direct";

// Fix Node 18+ preferring IPv6 addresses which leads to connect timeout/ENOTFOUND on Cloud Run
dns.setDefaultResultOrder("ipv4first");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API to fetch TikTok details
app.post(["/api/tiktok/info", "/tiktok/info"], async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, error: "Tautan TikTok diperlukan" });
      return;
    }

    // Convert shared links or user links, passing directly to TikWM API
    const tikwmParams = new URLSearchParams();
    tikwmParams.append("url", url);
    tikwmParams.append("hd", "1"); // Request HD option if available

    const domainsToTry = [
      "https://www.tikwm.com/api/",
      "https://api.tikwm.com/api/",
      "https://tikwm.com/api/"
    ];

    let tikwmData: any = null;
    let fallbackError = "";

    for (let attempt = 1; attempt <= 4; attempt++) {
      const domain = domainsToTry[(attempt - 1) % domainsToTry.length];
      console.log(`[TikTok] Fetching attempt ${attempt}/4 using ${domain}`);

      try {
        const tikwmResponse = await fetch(domain, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
          },
          body: tikwmParams.toString()
        });

        if (tikwmResponse.ok) {
          const responseData = await tikwmResponse.json();
          if (responseData.code === 0) {
            tikwmData = responseData;
            break;
          } else if (responseData.msg && (responseData.msg.includes("Free Api Limit") || responseData.msg.includes("limit"))) {
            fallbackError = responseData.msg;
            console.warn(`[TikTok] Hit rate limit on ${domain}: ${responseData.msg}. Retrying...`);
          } else {
            // It's a real error (like video is private), no point retrying
            tikwmData = responseData;
            break;
          }
        } else {
          fallbackError = `HTTP ${tikwmResponse.status}: ${tikwmResponse.statusText}`;
          console.warn(`[TikTok] ${domain} returned HTTP ${tikwmResponse.status}. Retrying...`);
        }
      } catch (err: any) {
        fallbackError = err.message || String(err);
        console.error(`[TikTok] Network error fetching from ${domain}:`, fallbackError);
      }

      if (attempt < 4) {
        const sleepDuration = 1000 + attempt * 500; // 1500ms, 2000ms, 2500ms
        console.log(`[TikTok] Waiting ${sleepDuration}ms before next retry...`);
        await new Promise(resolve => setTimeout(resolve, sleepDuration));
      }
    }

    if (!tikwmData) {
      res.status(408).json({
        success: false,
        error: `Server sedang sibuk karena batasan limit API TikTok. Silakan coba klik tombol Download/Analisis lagi dalam beberapa detik.`
      });
      return;
    }

    if (tikwmData.code !== 0) {
      res.status(400).json({
        success: false,
        error: tikwmData.msg || "Gagal mengambil data video. Pastikan tautan TikTok valid dan video tidak bersifat privat."
      });
      return;
    }

    res.json({
      success: true,
      data: tikwmData.data
    });

  } catch (error: any) {
    console.error("Error fetching TikTok info:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan internal ketika memproses tautan Anda."
    });
  }
});

// API to fetch Instagram details
app.post(["/api/instagram/info", "/instagram/info"], async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, error: "Tautan Instagram diperlukan" });
      return;
    }

    let processedUrl = url.trim();
    // Extract shortcode for Post, Reel or TV
    const igMatch = processedUrl.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_\-]+)/i);
    if (!igMatch) {
      res.status(400).json({
        success: false,
        error: "Tautan Instagram tidak valid. Pastikan link posts atau reels Anda benar."
      });
      return;
    }

    const shortcode = igMatch[1];
    
    let videoUrl = null;
    let coverUrl = "";
    let description = "Video Reels Instagram";
    let username = "instagram_creator";
    let nickname = "Kreator Instagram";

    // 1. First choice: try modern direct official GraphQL query using instagram-url-direct module
    try {
      console.log(`Mengambil data Instagram via API untuk shortcode: ${shortcode}`);
      const apiResult = await instagramGetUrl(processedUrl);
      if (apiResult && apiResult.media_details) {
        const videoDetail = apiResult.media_details.find((m: any) => m.type === "video");
        videoUrl = videoDetail ? videoDetail.url : (apiResult.url_list?.[0] || null);
        if (videoUrl) {
          coverUrl = videoDetail ? videoDetail.thumbnail : (apiResult.media_details[0]?.thumbnail || apiResult.media_details[0]?.url || "");
          description = apiResult.post_info?.caption || "Video Reels Instagram";
          username = apiResult.post_info?.owner_username || "instagram_creator";
          nickname = apiResult.post_info?.owner_fullname || username;
          console.log(`Berhasil mengambil media via API! URL: ${videoUrl.slice(0, 45)}...`);
        }
      }
    } catch (apiErr: any) {
      console.warn(`Metode API langsung gagal: ${apiErr.message || apiErr}. Beralih ke fallback scraping embed.`);
    }

    // 2. Second choice: fallback to Discord/Telegram embed mirror scraping
    if (!videoUrl) {
      const domainsToTry = [
        "instafix.repair"
      ];

      let html = "";
      let successfulDomain = "";
      let lastErrorMsg = "";

      for (const domain of domainsToTry) {
        const urlToFetch = `https://${domain}/reel/${shortcode}/`;
        try {
          console.log(`Menyambungkan ke mirror ${domain} untuk shortcode: ${shortcode}`);
          const response = await fetch(urlToFetch, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
            }
          });

          if (response.ok) {
            const content = await response.text();
            // Verify it contains target meta tag attributes to avoid false positive empty redirect pages
            if (content.includes("og:video") || content.includes("og:image") || content.includes("twitter:video")) {
              html = content;
              successfulDomain = domain;
              break;
            } else {
              console.warn(`Response dari ${domain} OK tapi tidak mempunyai meta tags media.`);
              lastErrorMsg = `Mirror ${domain} tidak mengembalikan data media yang valid`;
            }
          } else {
            console.warn(`Mirror ${domain} mengembalikan status: ${response.status}`);
            lastErrorMsg = `Mirror ${domain} mengembalikan status ${response.status}`;
          }
        } catch (err: any) {
          console.error(`Gagal menghubungi mirror ${domain}:`, err.message || err);
          lastErrorMsg = err.message || String(err);
        }
      }

      if (!html) {
        throw new Error(`Gagal mengambil data dari Instagram. Semua server pengunduh alternatif sedang sibuk atau offline. (Terakhir: ${lastErrorMsg})`);
      }

      const ogVideoMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i) || 
                           html.match(/<meta\s+property=["']og:video:secure_url["']\s+content=["']([^"']+)["']/i) ||
                           html.match(/<meta\s+name=["']twitter:video:stream["']\s+content=["']([^"']+)["']/i);

      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || 
                           html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);

      const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);

      videoUrl = ogVideoMatch ? ogVideoMatch[1] : null;
      coverUrl = ogImageMatch ? ogImageMatch[1] : null;
      description = ogDescMatch ? ogDescMatch[1] : "";

      // Unescape HTML description entities
      description = description
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'");

      // Format description text and extract username if pattern "User on Instagram" matches
      const userRegex = /^([^:]+) on Instagram/i;
      const userMatch = description.match(userRegex);
      if (userMatch) {
        username = userMatch[1].trim();
        nickname = username;
        description = description.replace(/^[^:]+ on Instagram:\s*“?|”$/gi, "");
      }
    }

    if (!videoUrl) {
      res.status(400).json({
        success: false,
        error: "Media Video tidak ditemukan. Pastikan posts/reels tersebut berupa video publik."
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: shortcode,
        title: description || "Video Reels Instagram",
        cover: coverUrl || "",
        duration: 0,
        play: videoUrl,
        wmplay: videoUrl, // fallback
        music: "", // no separate audio track parsed directly
        author: {
          id: shortcode,
          unique_id: username,
          nickname: nickname,
          avatar: "https://images.unsplash.com/photo-1611262588024-d12430b98920?w=150&auto=format&fit=crop&q=60"
        }
      }
    });

  } catch (error: any) {
    console.error("Instagram fetch error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal ketika mengambil video Instagram Anda."
    });
  }
});

// API to fetch YouTube details
app.post(["/api/youtube/info", "/youtube/info"], async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, error: "Tautan YouTube diperlukan" });
      return;
    }

    const processedUrl = url.trim();
    // Parse YouTube Video ID
    const youtubeIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|watch\?v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_\-]{11})/i;
    const match = processedUrl.match(youtubeIdRegex);
    
    if (!match) {
      res.status(400).json({
        success: false,
        error: "Tautan YouTube tidak valid. Pastikan URL video YouTube Anda benar."
      });
      return;
    }

    const videoId = match[1];
    const coverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    let title = "Video YouTube";
    let authorName = "Saluran YouTube";
    let authorUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Fetch details from YouTube oEmbed API
    try {
      const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        title = oembedData.title || title;
        authorName = oembedData.author_name || authorName;
        authorUrl = oembedData.author_url || authorUrl;
      }
    } catch (err) {
      console.warn("YouTube oEmbed fetch failed:", err);
    }

    res.json({
      success: true,
      data: {
        id: videoId,
        title: title,
        cover: coverUrl,
        duration: 0,
        play: processedUrl, // Keep original URL for download operations
        wmplay: processedUrl,
        music: "",
        author: {
          id: videoId,
          unique_id: authorName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "youtube_creator",
          nickname: authorName,
          avatar: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150&auto=format&fit=crop&q=60"
        }
      }
    });

  } catch (error: any) {
    console.error("YouTube fetch error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal ketika memproses tautan YouTube Anda."
    });
  }
});

// API to generate Cobalt download url for YouTube streams
app.post(["/api/youtube/download-url", "/youtube/download-url"], async (req, res) => {
  try {
    const { url, quality, isAudioOnly } = req.body;
    if (!url) {
      res.status(400).json({ success: false, error: "Tautan YouTube diperlukan" });
      return;
    }

    const cobaltDomains = [
      "https://api.cobalt.tools/api/json",
      "https://cobalt.api.red.velvet.red/api/json"
    ];

    let cobaltData: any = null;
    let cobaltError = "";

    for (const apiDomain of cobaltDomains) {
      try {
        console.log(`[YouTube] Fetching download URL via ${apiDomain}`);
        const response = await fetch(apiDomain, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            url: url,
            videoQuality: quality || "1080",
            isAudioOnly: isAudioOnly === true || isAudioOnly === "true",
            audioFormat: "mp3",
            downloadMode: "auto"
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && (data.url || data.picker)) {
            cobaltData = data;
            break;
          } else if (data && data.error) {
            cobaltError = data.error.code || JSON.stringify(data.error);
          }
        } else {
          cobaltError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (err: any) {
        cobaltError = err.message || String(err);
      }
    }

    if (!cobaltData) {
      res.status(500).json({
        success: false,
        error: `Gagal memproses download: ${cobaltError || "Server pengunduhan sedang sibuk"}. Silakan coba klik tombol Download lagi.`
      });
      return;
    }

    const finalUrl = cobaltData.url || (cobaltData.picker?.[0]?.url) || "";
    if (!finalUrl) {
      res.status(400).json({
        success: false,
        error: "Gagal menemukan stream data untuk video ini."
      });
      return;
    }

    res.json({
      success: true,
      downloadUrl: finalUrl
    });

  } catch (error: any) {
    console.error("YouTube download url generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal ketika mempersiapkan download YouTube."
    });
  }
});

// Proxy route for downloader streams to bypass CORS / hotlinking
app.get([
  "/api/tiktok/download", 
  "/tiktok/download",
  "/api/instagram/download",
  "/instagram/download",
  "/api/youtube/download",
  "/youtube/download"
], async (req, res) => {
  try {
    const { url, filename } = req.query;
    if (!url) {
      res.status(400).send("Missing download url query parameter.");
      return;
    }

    const downloadUrl = decodeURIComponent(url as string);
    const outputFilename = filename ? decodeURIComponent(filename as string) : "tiktok_video.mp4";

    const streamResponse = await fetch(downloadUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
      }
    });

    if (!streamResponse.ok) {
      res.status(streamResponse.status).send(`Failed to stream file: ${streamResponse.statusText}`);
      return;
    }

    if (!streamResponse.body) {
      res.status(500).send("No source body readable");
      return;
    }

    // Set headers for download containment
    res.setHeader("Content-Type", streamResponse.headers.get("content-type") || "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${outputFilename}"`);

    const contentLength = streamResponse.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    const nodeReadable = Readable.fromWeb(streamResponse.body as any);
    nodeReadable.pipe(res);

  } catch (error: any) {
    console.error("Downloader proxy stream error:", error);
    res.status(500).send("Terjadi kesalahan streaming media dari server TikTok.");
  }
});

export default app;

