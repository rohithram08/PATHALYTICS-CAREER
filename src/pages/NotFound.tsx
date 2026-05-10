import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 min-h-[70vh] flex items-center justify-center">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>

          <p className="text-sm font-semibold text-primary mb-2">404 Error</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Page not found
          </h1>
          <p className="text-muted-foreground mb-8">
            The page you are looking for does not exist, may have been moved, or the URL may be incorrect.
          </p>

          <div className="bg-card border border-border rounded-2xl p-5 text-left mb-8">
            <p className="text-sm font-medium text-foreground mb-1">Requested path</p>
            <p className="text-sm text-muted-foreground break-all">{location.pathname}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;