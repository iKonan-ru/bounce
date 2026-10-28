import { Navigate, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, useMe } from '@/lib/auth';

// Вход: логин и пароль, затем код из приложения-аутентификатора (если 2FA уже подключена).
export function LoginPage() {
  const me = useMe();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'password' | 'code'>('password');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to="/" />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await login(username, password, step === 'code' ? code : undefined);
      if (result === 'ok') {
        await navigate({ to: '/' });
      } else if (result === 'totp_required') {
        setStep('code');
      } else if (result === 'totp_invalid') {
        setCode('');
        setError('Код не подошёл. Введите текущий код из приложения.');
      } else {
        setStep('password');
        setError('Неверный логин или пароль');
      }
    } catch {
      setError('Сервер не отвечает. Проверьте соединение.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-10 flex items-center gap-3">
        <Logo />
        <span className="text-2xl font-semibold tracking-tight">Bounce</span>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {step === 'password' ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Код из приложения-аутентификатора</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-[0.4em]"
            />
          </div>
        )}
        {error && <p className="text-sm text-led-red">{error}</p>}
        <Button type="submit" size="lg" disabled={busy} className="mt-2">
          {step === 'password' ? 'Войти' : 'Подтвердить'}
        </Button>
        {step === 'code' && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setStep('password');
              setCode('');
              setError('');
            }}
          >
            Другой логин
          </Button>
        )}
      </form>
    </div>
  );
}
