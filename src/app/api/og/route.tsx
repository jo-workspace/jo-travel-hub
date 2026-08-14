import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'Jo Travel Hub';
  const dates = searchParams.get('dates') || '隨身旅遊助理';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="130"
            height="130"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.1-2 .8l-.6 1 4.5 3.5-3.5 3.5-2.3-.5-.9.9 2.5 2.5 2.5 2.5.9-.9-.5-2.3 3.5-3.5 3.5 4.5 1-.6c.7-.4 1-1.2.8-2z" />
          </svg>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            color: '#ffffff',
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#94a3b8',
            fontWeight: 500,
          }}
        >
          {dates} • Jo Travel Hub
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
