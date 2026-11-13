import React from 'react';

// 同時匹配 Markdown 連結 [文字](網址) 與 純網址 http(s)://...
const COMBINED_LINK_REGEX = /(?:\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s]+)/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"、。，；！？）】』」]+$/;

/**
 * 把文字中的網址（純網址或 Markdown [文字](網址)）自動轉成可點擊的超連結，其餘文字原樣保留。
 * 支援點擊防冒泡 (stopPropagation) 與新分頁安全開啟。
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  COMBINED_LINK_REGEX.lastIndex = 0;
  while ((match = COMBINED_LINK_REGEX.exec(text))) {
    const start = match.index;
    const isMarkdown = Boolean(match[1] && match[2]);

    let url = isMarkdown ? match[2] : match[3];
    let displayText = isMarkdown ? match[1] : match[3];
    let trailing = '';

    // 純網址情況下，需剝除常見結尾標點符號（英文與中文字元）
    if (!isMarkdown) {
      const trailingMatch = url.match(TRAILING_PUNCTUATION);
      if (trailingMatch) {
        trailing = trailingMatch[0];
        url = url.slice(0, url.length - trailing.length);
        displayText = url;
      }
    }

    // 加入網址前的純文字
    if (start > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>
          {text.slice(lastIndex, start)}
        </span>
      );
    }

    // 加入超連結
    parts.push(
      <a
        key={`link-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-sky-600 hover:text-sky-700 underline underline-offset-2 break-all font-medium transition-colors cursor-pointer"
        title={displayText}
      >
        {displayText}
      </a>
    );

    if (trailing) {
      parts.push(<span key={`trail-${key++}`}>{trailing}</span>);
    }

    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${key++}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts;
}

