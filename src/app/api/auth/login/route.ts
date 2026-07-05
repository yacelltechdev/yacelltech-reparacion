import { NextResponse } from 'next/server';

const HARDCODED: Record<string, { username: string; password: string; role: string }> = {
  freddy:    { username: 'Freddy', password: '1234',     role: 'tech' },
  oscar:     { username: 'Oscar',  password: 'chachito', role: 'taller_jefe' },
  carlos:    { username: 'Carlos', password: '1234',     role: 'tech' },
  admin:     { username: 'admin',  password: 'admin',    role: 'admin' },
  caja:      { username: 'caja',   password: '1234',     role: 'caja' },
};

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const key = username?.toLowerCase?.() ?? '';
    const hardcoded = HARDCODED[key];
    if (!hardcoded || hardcoded.password !== password) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }
    return NextResponse.json({ username: hardcoded.username, role: hardcoded.role });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
