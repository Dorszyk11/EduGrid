import { NextResponse } from 'next/server';

const COOKIE_NAME = 'payload-token';

export async function POST() {
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': cookie } });
}
