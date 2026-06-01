export interface TikTokVideoInfo {
  id: string;
  title: string;
  cover: string;
  duration: number;
  play: string;
  wmplay: string;
  hdplay?: string;
  size?: number;
  hd_size?: number;
  wm_size?: number;
  music: string;
  music_info: {
    id: string;
    title: string;
    play: string;
    author: string;
    cover: string;
  };
  author: {
    id: string;
    unique_id: string;
    nickname: string;
    avatar: string;
  };
  statistics?: {
    play_count?: number;
    digg_count?: number;
    comment_count?: number;
    share_count?: number;
    download_count?: number;
  };
}

export interface DownloadHistory {
  id: string;
  url: string;
  title: string;
  authorName: string;
  authorUsername: string;
  avatar: string;
  cover: string;
  downloadedAt: string;
}
