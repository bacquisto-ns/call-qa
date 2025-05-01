
'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/firebase/hooks/useAuth';
import Login from '@/components/Login';
import { Skeleton } from '@/components/ui/skeleton'; // Assuming Skeleton component exists

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4">
         <Skeleton className="h-10 w-48 mb-4" />
         <Skeleton className="h-6 w-32" />
       </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <>{children}</>;
}
