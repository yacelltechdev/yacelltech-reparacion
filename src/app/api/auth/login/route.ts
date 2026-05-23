import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

const HARDCODED: Record<string, { username: string; password: string; role: string }> = {
  freddy: { username: 'Freddy', password: '1234', role: 'tech' },
  oscar:  { username: 'Oscar', password: 'chachito', role: 'tech' },
  carlos: { username: 'Carlos', password: '1234', role: 'tech' },
  admin:  { username: 'admin', password: 'admin', role: 'admin' },
  caja:   { username: 'caja', password: '1234', role: 'caja' },
};

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const key = username?.toLowerCase?.() ?? '';

  // Check DB first (overrides hardcoded)
  const { data } = await supabase
    .from('users')
    .select('username, password, role')
    .eq('username', key)
    .single();

  if (data) {
    if (data.password !== password) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }
    return NextResponse.json({ username: data.username || username, role: data.role });
  }

  // Fallback to hardcoded
  const hardcoded = HARDCODED[key];
  if (!hardcoded || hardcoded.password !== password) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }
  return NextResponse.json({ username: hardcoded.username, role: hardcoded.role });
}
