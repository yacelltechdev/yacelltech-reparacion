import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

const HARDCODED: Record<string, { password: string; role: string }> = {
  freddy: { password: '1234', role: 'tech' },
  oscar:  { password: '1234', role: 'tech' },
  carlos: { password: '1234', role: 'tech' },
  admin:  { password: 'admin', role: 'admin' },
  caja:   { password: '1234', role: 'caja' },
};

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const key = username?.toLowerCase?.() ?? '';

  // Check DB first (overrides hardcoded)
  const { data } = await supabase
    .from('users')
    .select('password, role')
    .eq('username', key)
    .single();

  if (data) {
    if (data.password !== password) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }
    return NextResponse.json({ role: data.role });
  }

  // Fallback to hardcoded
  const hardcoded = HARDCODED[key];
  if (!hardcoded || hardcoded.password !== password) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }
  return NextResponse.json({ role: hardcoded.role });
}
