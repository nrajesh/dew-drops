import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from './ui/skeleton';

const ProtectedRoute = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;