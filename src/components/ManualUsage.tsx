import React from "react";
import { Link, Copy, Eye, Download } from "lucide-react";

interface ManualUsageProps {
  platform?: "tiktok" | "instagram" | "youtube";
}

export function ManualUsage({ platform = "tiktok" }: ManualUsageProps) {
  const isInstagram = platform === "instagram";
  const isYoutube = platform === "youtube";

  const steps = [
    {
      num: "01",
      icon: <Link className="h-5 w-5 text-tiktok-cyan" />,
      title: isInstagram ? "Salin Tautan Instagram" : isYoutube ? "Salin Tautan YouTube" : "Salin Tautan TikTok",
      desc: isInstagram 
        ? "Buka aplikasi Instagram. Klik icon Pesawat/Bagikan pada Post atau Reels yang Anda sukai lalu klik opsi 'Salin Tautan'."
        : isYoutube
        ? "Buka aplikasi YouTube. Klik bagikan (share) pada Video atau Shorts yang Anda suka lalu pilih 'Salin Tautan' / 'Copy Link'."
        : "Buka aplikasi TikTok atau Tiktok Web. Klik bagikan (share) pada video yang Anda suka lalu pilih 'Salin Tautan'."
    },
    {
      num: "02",
      icon: <Copy className="h-5 w-5 text-tiktok-pink" />,
      title: "Tempel di Kotak Unduh",
      desc: "Tempelkan (paste) tautan yang sudah disalin ke dalam kotak pencarian di atas. Sistem kami mendeteksi platform otomatis!"
    },
    {
      num: "03",
      icon: <Eye className="h-5 w-5 text-tiktok-purple" />,
      title: "Pratinjau Otomatis",
      desc: isInstagram
        ? "Sesaat setelah menempelkan link, pemutar video Reels langsung berjalan dilengkapi dengan preview dan profil pembuat."
        : isYoutube
        ? "Sesaat setelah menempelkan link, detail video YouTube langsung tampil beserta thumbnail dan judul lengkap."
        : "Sesaat setelah menempelkan link, pemutar video akan langsung muncul dengan info pembuat dan durasi lengkap."
    },
    {
      num: "04",
      icon: <Download className="h-5 w-5 text-emerald-400" />,
      title: isInstagram ? "Unduh MP4 HD Instagram" : isYoutube ? "Unduh MP4 / MP3 YouTube" : "Unduh HD Tanpa Air",
      desc: isInstagram
        ? "Klik tombol download video Instagram HD untuk langsung menyimpan video orisinal beresolusi tajam ke perangkat Anda."
        : isYoutube
        ? "Mendukung download instan Video Full HD (1080p, 720p) tanpa watermark dan konversi Audio MP3 langsung dari server."
        : "Pilih opsi unduhan berkualitas tinggi (HD) atau musik MP3. Server kami memproses instan untuk disimpan ke galeri Anda."
    }
  ];

  return (
    <div className="w-full rounded-[2rem] glass-card p-6 md:p-8">
      <div className="text-center max-w-xl mx-auto mb-8">
        <span className="text-[11px] font-black tracking-widest text-[#ff0050] uppercase">Fitur Andalan</span>
        <h2 className="font-display text-2xl font-bold text-white mt-1">Langkah Mudah Mengunduh</h2>
        <p className="text-sm text-white/60 mt-2 font-medium">
          {isInstagram 
            ? "Kami menyediakan pemrosesan secepat kilat untuk merubah link Instagram Reels & Post menjadi file MP4 siap download."
            : isYoutube
            ? "Kami menyediakan pemrosesan secepat kilat untuk mengunduh video YouTube dan Shorts dalam format video HD maupun MP3."
            : "Kami menyediakan pemrosesan secepat kilat untuk merubah link TikTok menjadi file siap tonton dan bebas watermark."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, idx) => (
          <div key={idx} className="relative group rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 p-5 transition duration-300">
            <div className="absolute top-4 right-4 font-mono text-2xl font-black text-white/5 group-hover:text-white/10 transition duration-300">
              {step.num}
            </div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
              {step.icon}
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
            <p className="text-xs leading-relaxed text-white/50 font-medium">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

