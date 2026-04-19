import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

const HARDCODED: Record<string, string> = {
  freddy: '1234', oscar: '1234', carlos: '1234', admin: 'admin', caja: '1234',
};

export async function POST(req: Request) {
  const { username, currentPassword, newPassword } = await req.json();
  const key = username?.toLowerCase?.() ?? '';

  if (!newPassword || newPassword.length < 4) {
    return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' }, { status: 400 });
  }

  // Verify current password (DB first, fallback to hardcoded)
  const { data: existing } = await supabase
    .from('users')
    .select('password, role')
    .eq('username', key)
    .single();

  const currentCorrect = existing
    ? existing.password === currentPassword
    : HARDCODED[key] === currentPassword;

  if (!currentCorrect) {
    return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 });
  }

  if (existing) {
    await supabase.from('users').update({ password: newPassword }).eq('username', key);
  } else {
    // Insert into DB so it overrides hardcoded from now on
    const role = key === 'admin' ? 'admin' : key === 'caja' ? 'caja' : 'tech';
    await supabase.from('users').insert({ username: key, password: newPassword, role });
  }

  return NextResponse.json({ ok: true });
}
