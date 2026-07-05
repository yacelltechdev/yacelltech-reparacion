import { NextResponse } from 'next/server';

const HARDCODED: Record<string, { password: string; role: string }> = {
  freddy:    { password: '1234',     role: 'tech' },
  oscar:     { password: 'chachito', role: 'tech' },
  carlos:    { password: '1234',     role: 'tech' },
  admin:     { password: 'admin',    role: 'admin' },
  caja:      { password: '1234',     role: 'caja' },
};

export async function POST(req: Request) {
  try {
    const { username, currentPassword, newPassword } = await req.json();
    const key = username?.toLowerCase?.() ?? '';

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' }, { status: 400 });
    }

    const user = HARDCODED[key];
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    if (user.password !== currentPassword) {
      return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 });
    }

    // Actualizar la contraseña en memoria (efímero — al redeploy vuelve al hardcoded)
    user.password = newPassword;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
