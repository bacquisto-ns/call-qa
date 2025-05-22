
'use client';

import type { ChangeEvent } from 'react';
import type { ChangeEvent } from 'react'; // Keep this if it's used, or remove
import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Agent } from '@/lib/types'; // Added
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added
import { Label } from '@/components/ui/label'; // Added
import { auth, storage, db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from 'lucide-react'; // Added Loader2

interface FileUploadProps {
  onUploadSuccess: (callId: string, agentId?: string) => void; // Modified signature
  disabled?: boolean;
  agents: Agent[]; // New prop
}

export default function FileUpload({ onUploadSuccess, disabled = false, agents }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined); // Added agent state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second
  const { toast } = useToast();
  const user = auth.currentUser;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return; // Prevent file change if disabled
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
    if (disabled) { // Check if disabled before starting upload
        toast({
            title: "Processing Busy",
            description: "Please wait for the current analysis to complete.",
            variant: "default", // Use default or secondary variant
        });
        return;
    }


    console.log("[FileUpload] Starting upload...");
    setUploading(true);
    setProgress(0); // Reset progress

    const storageRef = ref(storage, `calls/${user.uid}/${Date.now()}_${file.name}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    const uploadWithRetry = (retryCount = 0) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const currentProgress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(currentProgress);
        },
        (error) => {
          console.error('[FileUpload] Error during upload state change:', error);
          if (retryCount < MAX_RETRIES) {
            console.log(`[FileUpload] Retrying upload, attempt ${retryCount + 1}...`);
            setTimeout(() => uploadWithRetry(retryCount + 1), RETRY_DELAY * (retryCount + 1)); // Increase delay
          } else {
            console.error('[FileUpload] Max retries reached. Upload failed permanently.');
            toast({
              title: "Upload Failed",
              description: `An error occurred during upload after ${MAX_RETRIES} retries. Please try again.`,
              variant: "destructive",
            });
            setUploading(false); // Ensure uploading state is reset on permanent failure
            setProgress(0);
          }
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('[FileUpload] Upload successful. Download URL:', downloadURL);

            // Store metadata in Firestore
             console.log('[FileUpload] Adding call metadata to Firestore...');
            const docRef = await addDoc(collection(db, 'calls'), {
              userId: user.uid,
              fileName: file.name,
              storageUrl: downloadURL,
              status: 'uploaded', // Initial status
              createdAt: serverTimestamp(),
            });
            console.log('[FileUpload] Firestore document created with ID:', docRef.id);


            toast({
              title: "Upload Successful",
              description: `${file.name} has been uploaded. Starting analysis...`,
            });
            setFile(null); // Clear file input
            onUploadSuccess(docRef.id, selectedAgentId === "none" || !selectedAgentId ? undefined : selectedAgentId); // Pass agentId
          } catch (error) {
            console.error('[FileUpload] Error getting download URL or saving metadata:', error);
            toast({
              title: "Upload Failed",
              description: "An error occurred after upload completed (saving metadata). Please check console.",
              variant: "destructive",
            });
          } finally {
            console.log('[FileUpload] Upload process finished (success or final error).');
            setUploading(false);
            setProgress(0); // Reset progress after completion or error
          }
        }
      );
    }

    uploadWithRetry();
  };

  return (
    <div className={`flex flex-col space-y-4 p-4 border rounded-lg shadow-sm bg-card ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}>
      {/* Agent Selection Dropdown */}
      <div className="w-full">
        <Label htmlFor="agent-select" className="mb-1 block text-sm font-medium text-muted-foreground">
          Assign to Agent (Optional)
        </Label>
        <Select
          value={selectedAgentId}
          onValueChange={(value) => setSelectedAgentId(value === "none" ? undefined : value)}
          disabled={disabled || uploading || agents.length === 0}
        >
          <SelectTrigger id="agent-select" className="w-full">
            <SelectValue placeholder="Select Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {agents.length === 0 && !uploading && (
          <p className="text-xs text-muted-foreground mt-1">
            No agents available. You can add agents in the admin panel.
          </p>
        )}
      </div>

      {/* File Input Area */}
      <label htmlFor="file-upload" className={`cursor-pointer flex flex-col items-center text-center p-6 border-2 border-dashed border-input rounded-lg ${!disabled && !uploading ? 'hover:border-accent' : ''} transition-colors w-full ${disabled || uploading ? 'pointer-events-none opacity-50' : ''}`}>
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
          disabled={uploading || disabled} // Disable input during upload or if parent disables
        />
      </label>
      {file && !uploading && (
        <Button
           onClick={handleUpload}
           className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
           disabled={disabled || uploading} // Disable button if disabled or already uploading
        >
          Upload Call Recording
        </Button>
      )}
      {uploading && (
        <div className="w-full text-center">
          <Progress value={progress} className="w-full mb-2 h-2" />
          <p className="text-sm text-muted-foreground flex items-center justify-center">
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             Uploading {file?.name}... {progress}%
          </p>
        </div>
      )}
       {disabled && !uploading && (
         <p className="text-sm text-muted-foreground text-center mt-2">
             Analysis in progress, please wait...
         </p>
       )}
    </div>
  );
}
