import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import CelebrationClient from './CelebrationClient';

export default async function CelebrationPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (!me.isOnboarded) redirect('/onboarding');
  return <CelebrationClient nickname={me.nickname} />;
}
