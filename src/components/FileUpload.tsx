
'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, storage, db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onUploadSuccess: (callId: string) => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const user = auth.currentUser;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'audio/mpeg') { // Basic check for MP3
        setFile(selectedFile);
      } else {
        setFile(null);
        toast({
          title: "Invalid File Type",
          description: "Please upload an MP3 audio file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) {
      toast({
        title: "Upload Error",
        description: !user ? "You must be logged in to upload." : "Please select an MP3 file first.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0); // Reset progress

    const storageRef = ref(storage, `calls/${user.uid}/${Date.now()}_${file.name}`);

    try {
       // Simulate progress for demo purposes
       // In a real app, you'd use uploadBytesResumable and monitor progress
       setProgress(30);
       await new Promise(resolve => setTimeout(resolve, 500)); // Simulate upload delay
       setProgress(70);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

       setProgress(100);

      // Store metadata in Firestore
      const docRef = await addDoc(collection(db, 'calls'), {
        userId: user.uid,
        fileName: file.name,
        storageUrl: downloadURL,
        status: 'uploaded', // Initial status
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded.`,
      });
      setFile(null); // Clear file input
      onUploadSuccess(docRef.id); // Pass the new document ID back

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: "An error occurred during upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0); // Reset progress after completion or error
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg shadow-sm bg-card">
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center text-center p-6 border-2 border-dashed border-input rounded-lg hover:border-accent transition-colors w-full">
        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
        <span className="text-sm font-medium text-foreground">
          {file ? file.name : 'Click or drag MP3 file to upload'}
        </span>
        <span className="text-xs text-muted-foreground mt-1">MP3 format only</span>
        <Input
          id="file-upload"
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={handleFileChange}
          className="sr-only" // Hide default input, style the label instead
          disabled={uploading}
        />
      </label>
      {file && !uploading && (
        <Button onClick={handleUpload} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          Upload Call Recording
        </Button>
      )}
      {uploading && (
        <div className="w-full text-center">
          <Progress value={progress} className="w-full mb-2 h-2" />
          <p className="text-sm text-muted-foreground">Uploading {file?.name}... {progress}%</p>
        </div>
      )}
    </div>
  );
}
