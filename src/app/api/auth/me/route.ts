import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

const COOKIE_NAME = 'payload-token';

function getTokenFromCookie(headers: Headers): string | null {
  const cookie = headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers);
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const payload = await getPayload({ config });
    const secret = (payload.config as { secret?: string }).secret;
    if (!secret) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const { payload: decoded } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    const userId = decoded.id as string;
    const collectionSlug = (decoded.collection as string) || 'users';
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const user = await payload.findByID({
      collection: collectionSlug,
      id: userId,
      depth: 0,
    });
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        imie: (user as { imie?: string }).imie,
        nazwisko: (user as { nazwisko?: string }).nazwisko,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
