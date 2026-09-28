'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { seedDemoData } from '@/lib/seed-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartLine, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { signIn, signUp, user, session } = useAuth();
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);

  useEffect(() => {
    if (user && session) {
      router.replace('/dashboard');
    }
  }, [user, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = isSignup ? await signUp(email, password) : await signIn(email, password);

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    if (isSignup) {
      setSeeding(true);
      const { data: { session: newSession } } = await (await import('@/lib/supabase-client')).supabase.auth.getSession();
      if (newSession?.user) {
        await seedDemoData(newSession.user.id);
      }
      setSeeding(false);
    }

    router.push('/dashboard');
  };

  if (seeding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
        <p className="text-sm text-gray-600">데모 데이터를 생성하고 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500 text-white">
            <ChartLine className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">쇼핑 SEO 분석</div>
            <div className="text-xs text-gray-500">네이버 쇼핑 자체진분 도구</div>
          </div>
        </div>

        <Card className="shadow-lg border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl">{isSignup ? '회원가입' : '로그인'}</CardTitle>
            <CardDescription>
              {isSignup
                ? '계정을 생성하면 3개 데모 상품과 분석 데이터가 자동으로 생성됩니다.'
                : '이메일과 비밀번호를 입력하여 로그인하세요.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="최소 6자 이상"
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-600" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSignup ? '회원가입' : '로그인'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-gray-500">
              {isSignup ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}{' '}
              <button
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError('');
                }}
                className="text-sky-600 hover:text-sky-700 font-medium"
              >
                {isSignup ? '로그인' : '회원가입'}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-400 max-w-sm mx-auto">
          본 서비스는 네이버 쇼핑 검색 순위를 인위적으로 조작하거나 자동 검색, 자동 클릭,
          체류시간 조작, 가짜 트래픽, 리뷰 조작 등을 수행하지 않습니다.
          모든 점수는 자체 진단 점수이며 네이버 공식 점수가 아닙니다.
        </p>
      </div>
    </div>
  );
}
