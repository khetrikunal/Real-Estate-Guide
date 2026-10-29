import { notFound } from 'next/navigation';
import EnterpriseAccessPage from '@app/architecture/EnterpriseAccessPage';
import { ROLE_ORDER, type RoleKey } from '@/lib/roles';

export default async function LoginPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!ROLE_ORDER.includes(role as RoleKey)) notFound();
  return <EnterpriseAccessPage />;
}
