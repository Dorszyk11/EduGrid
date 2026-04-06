import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { AUTH_COOKIE_NAME, AUTH_JWT_REMEMBER_CLAIM } from '@/utils/auth';

function getTokenFromCookie(headers: Headers): string | null {
  const cookie = headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers);
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const payload = await getPayload({ config });
    // Musi być `payload.secret` (pochodna z config), nie surowy `config.secret` — tak podpisuje Payload JWT.
    const { payload: decoded } = await jwtVerify(
      token,
      new TextEncoder().encode(payload.secret)
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
    // Brak `rm` w starych tokenach — traktuj jak „zapamiętaj”, żeby nie wylogować istniejących sesji.
    const rememberMe = decoded[AUTH_JWT_REMEMBER_CLAIM] !== false;
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        imie: (user as { imie?: string }).imie,
        nazwisko: (user as { nazwisko?: string }).nazwisko,
      },
      rememberMe,
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
