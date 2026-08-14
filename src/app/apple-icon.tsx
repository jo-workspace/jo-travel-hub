import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <rect x="-10" y="-10" width="120" height="120" fill="#0f172a" />
          <g transform="translate(10, 10) scale(3.3)">
            <path
              d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.1-2 .8l-.6 1 4.5 3.5-3.5 3.5-2.3-.5-.9.9 2.5 2.5 2.5 2.5.9-.9-.5-2.3 3.5-3.5 3.5 4.5 1-.6c.7-.4 1-1.2.8-2z"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}
