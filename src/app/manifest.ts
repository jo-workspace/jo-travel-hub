import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jo Travel Hub',
    short_name: 'Travel Hub',
    description: '隨身旅遊助理',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    // 為了防止 iOS 抓取 SVG 而產生白邊，這裡我們不放 icon.svg
    // Next.js 會自動在 <head> 產生 <link rel="apple-touch-icon" href="/apple-icon.png" /> 供 iOS 使用
    icons: [
      {
        src: '/apple-icon?v=3',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
