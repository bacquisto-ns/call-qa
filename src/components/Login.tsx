'use client';

import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chrome, Mail, KeyRound } from 'lucide-react'; // Added Mail and KeyRound icons
import { Separator } from '@/components/ui/separator'; // Added Separator

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // State for error messages

  const handleGoogleSignIn = () => {
    setError(null); // Clear previous errors
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .catch((err) => {
        console.error('Error during Google sign-in:', err);
        setError(err.message || 'Failed to sign in with Google.'); // Set error state
      });
  };

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    setError(null); // Clear previous errors
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User is signed in, AuthWrapper will handle redirect/display
    } catch (err: any) { // Catch specific error type if known, otherwise 'any'
      console.error('Error during email/password sign-in:', err);
      // Provide more user-friendly error messages based on Firebase error codes
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No user found with this email.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
         case 'auth/invalid-credential':
           setError('Invalid credentials. Please check your email and password.');
           break;
        default:
          setError(err.message || 'Failed to sign in. Please try again.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">CallQA Login</CardTitle>
          <CardDescription>Sign in to access your call evaluations.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          {/* Email/Password Form */}
          <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   id="email"
                   type="email"
                   placeholder="you@example.com"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   required
                   className="pl-10" // Add padding for the icon
                 />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10" // Add padding for the icon
                />
              </div>
            </div>
             {error && <p className="text-sm text-red-600 dark:text-red-500 text-center">{error}</p>}
            <Button type="submit" className="w-full">
              Sign in with Email
            </Button>
          </form>

          {/* Separator */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <Button onClick={handleGoogleSignIn} variant="outline" className="w-full">
            <Chrome className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
