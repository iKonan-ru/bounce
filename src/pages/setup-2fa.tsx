import { useMutation, useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from '@tanstack/react-router';
import QRCode from 'qrcode';
import { type FormEvent, useState } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { enableTotp, logout, startTotpSetup, useMe } from '@/lib/auth';
import { queryKeys } from '@/lib/query-keys';
import { takeReturn } from '@/lib/return-to';

// Подключение 2FA: обязательно при первом входе и после сброса главным пользователем.
export function SetupTotpPage() {
  const me = useMe();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // новый ключ при каждом открытии экрана; прежний неподтверждённый пропадает
  const setup = useQuery({
    queryKey: queryKeys.totpSetup(me?.id),
    queryFn: async () => {
      const s = await startTotpSetup();
      const qr = await QRCode.toDataURL(s.uri, { margin: 1, width: 240 });
      return { ...s, qr };
    },
    enabled: me !== null && !me.totpEnabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
  });

  const enable = useMutation({
    mutationFn: () => enableTotp(code),
    onSuccess: async (ok) => {
      if (ok) {
        await navigate({ href: takeReturn(), replace: true });
      } else {
        setCode('');
        setError('Код не подошёл. Проверьте, что время на телефоне выставлено автоматически.');
      }
    },
    onError: () => setError('Сервер не отвечает. Проверьте соединение.'),
  });

  if (!me) return <Navigate to="/login" />;
  if (me.totpEnabled) return <Navigate to="/" replace />;

  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    enable.mutate();
  }

  // ключ группами по 4 знака - удобнее переписывать руками
  const secret = setup.data?.secret.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Logo />
        <span className="text-2xl font-semibold tracking-tight">Bounce</span>
      </div>
      <h1 className="text-xl font-semibold">Подключите 2FA</h1>
      <p className="mt-2 text-sm text-dim">
        Отсканируйте код в приложении-аутентификаторе (Google Authenticator, 1Password, Яндекс Ключ)
        и введите шесть цифр, которые оно покажет. Без этого данные проектов недоступны.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-xl bg-panel p-4">
        {setup.data ? (
          <img
            src={setup.data.qr}
            alt="QR-код для приложения-аутентификатора"
            width={200}
            height={200}
            className="rounded-md bg-white p-2"
          />
        ) : (
          <div className="size-[200px] animate-pulse rounded-md bg-groove" />
        )}
        {setup.isError && (
          <p className="text-sm text-led-red">Ключ не получен. Обновите страницу.</p>
        )}
        {secret && (
          <p className="text-center text-xs text-dim">
            Или введите ключ вручную:
            <br />
            <span className="font-mono text-sm text-ink select-all">{secret}</span>
          </p>
        )}
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Код из приложения</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-[0.4em]"
          />
        </div>
        {error && <p className="text-sm text-led-red">{error}</p>}
        <Button
          type="submit"
          size="lg"
          disabled={!setup.data || enable.isPending || code.length !== 6}
        >
          Подключить
        </Button>
        <Button type="button" variant="ghost" disabled={enable.isPending} onClick={logout}>
          Выйти
        </Button>
      </form>
    </div>
  );
}
