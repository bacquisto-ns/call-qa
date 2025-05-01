
'use client';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome } from 'lucide-react'; // Using Chrome icon for Google

export default function Login() {
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // User is signed in, AuthWrapper will handle redirect/display
    } catch (error) {
      console.error('Error during Google sign-in:', error);
      // Handle error (e.g., show a toast message)
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">CallQA Login</CardTitle>
          <CardDescription>Sign in to access your call evaluations.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
           <p className="text-sm text-muted-foreground">Please sign in using your Google account.</p>
          <Button onClick={handleGoogleSignIn} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <Chrome className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
