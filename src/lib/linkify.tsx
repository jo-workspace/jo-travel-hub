import React from 'react';

const URL_REGEX = /https?:\/\/[^\s]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

// 把文字中的網址自動轉成可點擊連結，其餘文字原樣保留
export function linkifyText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text))) {
    const start = match.index;
    let url = match[0];

    // 網址結尾常見的標點符號（句號、逗號、括號等）不應納入連結
    const trailingMatch = url.match(TRAILING_PUNCTUATION);
    let trailing = '';
    if (trailingMatch) {
      trailing = trailingMatch[0];
      url = url.slice(0, url.length - trailing.length);
    }

    if (start > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>
          {text.slice(lastIndex, start)}
        </span>
      );
    }

    parts.push(
      <a
        key={`link-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-600 hover:text-sky-700 underline underline-offset-2 break-all"
      >
        {url}
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
