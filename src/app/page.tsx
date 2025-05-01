
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import AuthWrapper from '@/components/AuthWrapper';
import FileUpload from '@/components/FileUpload';
import EvaluationResults from '@/components/EvaluationResults';
import type { EvaluateCallQualityOutput } from '@/ai/flows/evaluate-call-quality';
import { evaluateCallQuality } from '@/ai/flows/evaluate-call-quality';
import { transcribeAudioFlow } from '@/ai/flows/transcribe-audio'; // Assuming this exists
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CallData {
  id: string;
  fileName: string;
  storageUrl: string;
  status: 'uploaded' | 'transcribing' | 'evaluating' | 'completed' | 'failed';
  transcription?: string;
  evaluation?: EvaluateCallQualityOutput;
  createdAt: any; // Firestore timestamp type can be complex
  error?: string;
}

export default function Home() {
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const { toast } = useToast();

  const processCall = useCallback(async (callId: string) => {
    setIsLoadingEvaluation(true);
    setCurrentCall(prev => prev ? { ...prev, status: 'processing' } : null); // Optimistic UI update

    try {
      console.log(`Processing call ID: ${callId}`);
      const callDocRef = doc(db, 'calls', callId);
      const callSnap = await getDoc(callDocRef);

      if (!callSnap.exists()) {
        throw new Error("Call document not found.");
      }

      const callData = callSnap.data() as Omit<CallData, 'id'>;
      const storageUrl = callData.storageUrl;

      if (!storageUrl) {
         throw new Error("Storage URL not found in call data.");
      }

      // 1. Transcription
      console.log(`Starting transcription for: ${storageUrl}`);
      setCurrentCall(prev => prev ? { ...prev, status: 'transcribing' } : null);
      const transcriptionResult = await transcribeAudioFlow({ storageUrl });
      const transcription = transcriptionResult.transcription;
      console.log("Transcription completed.");
      setCurrentCall(prev => prev ? { ...prev, transcription, status: 'evaluating' } : prev);


      // 2. Evaluation
      console.log(`Starting evaluation for: ${storageUrl}`);
       const evaluationResult = await evaluateCallQuality({ audioStorageUrl: storageUrl });
      console.log("Evaluation completed.");


      // Update Firestore - This part would ideally be in a backend function triggered by the upload
      // For simplicity in this scaffold, we do it client-side after processing.
      // In a real app, the backend would update Firestore and the client would listen for changes.
      setCurrentCall(prev => prev ? {
         ...prev,
         id: callId,
         fileName: callData.fileName,
         storageUrl: callData.storageUrl,
         createdAt: callData.createdAt,
         transcription: transcription,
         evaluation: evaluationResult,
         status: 'completed'
      } : null);


      toast({
        title: "Processing Complete",
        description: `Evaluation finished for ${callData.fileName}.`,
      });

    } catch (error: any) {
       console.error('Error processing call:', error);
       setCurrentCall(prev => prev ? { ...prev, status: 'failed', error: error.message } : null);
       toast({
         title: "Processing Failed",
         description: `An error occurred: ${error.message}`,
         variant: "destructive",
       });
    } finally {
      setIsLoadingEvaluation(false);
    }
  }, [toast]);

  // // Optional: Firestore listener for real-time updates (if backend updates Firestore)
  // useEffect(() => {
  //   if (!currentCallId) return;
  //
  //   const unsub = onSnapshot(doc(db, "calls", currentCallId), (doc) => {
  //     if (doc.exists()) {
  //       const data = doc.data() as Omit<CallData, 'id'>;
  //       setCurrentCall({ id: doc.id, ...data });
  //       setIsLoadingEvaluation(data.status === 'processing' || data.status === 'transcribing' || data.status === 'evaluating');
  //       if (data.status === 'failed') {
  //          toast({ title: "Processing Failed", description: data.error || "An unknown error occurred.", variant: "destructive" });
  //       }
  //     } else {
  //       console.log("Call document deleted or does not exist.");
  //       setCurrentCall(null);
  //     }
  //   });
  //
  //   return () => unsub();
  // }, [currentCallId, toast]);


  const handleUploadSuccess = (callId: string) => {
     console.log("Upload successful, call ID:", callId);
     // Fetch initial data to display something while processing
     const callDocRef = doc(db, 'calls', callId);
     getDoc(callDocRef).then(docSnap => {
        if (docSnap.exists()) {
          setCurrentCall({ id: docSnap.id, ...(docSnap.data() as Omit<CallData, 'id'>) });
          // Start processing immediately after upload success
          processCall(callId);
        } else {
          console.error("Uploaded document not found immediately after creation.");
           toast({ title: "Error", description: "Could not find the uploaded call record.", variant: "destructive"});
        }
     }).catch(error => {
       console.error("Error fetching initial call data:", error);
       toast({ title: "Error", description: "Failed to load initial call data.", variant: "destructive"});
     });
   };


  return (
     <AuthWrapper>
       <div className="container mx-auto p-4 md:p-8 space-y-8">
         <header className="text-center">
           <h1 className="text-3xl md:text-4xl font-bold text-primary">CallQA</h1>
           <p className="text-muted-foreground mt-2">Upload and analyze your call center recordings.</p>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="md:col-span-1">
              <Card className="shadow-md">
                 <CardHeader>
                    <CardTitle>Upload Recording</CardTitle>
                    <CardDescription>Select an MP3 file to analyze.</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <FileUpload onUploadSuccess={handleUploadSuccess} />
                 </CardContent>
              </Card>
           </div>

           <div className="md:col-span-2">
             <EvaluationResults
               transcription={currentCall?.transcription ?? null}
               evaluation={currentCall?.evaluation ?? null}
               audioUrl={currentCall?.storageUrl ?? null}
               isLoading={isLoadingEvaluation || currentCall?.status === 'processing' || currentCall?.status === 'transcribing' || currentCall?.status === 'evaluating'}
             />
             {currentCall?.status === 'failed' && (
                <Card className="mt-4 border-destructive bg-destructive/10">
                   <CardHeader>
                      <CardTitle className="text-destructive">Processing Failed</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <p className="text-destructive-foreground text-sm">{currentCall.error || 'An unknown error occurred during processing.'}</p>
                   </CardContent>
                </Card>
              )}
           </div>
         </div>
         <Toaster />
       </div>
     </AuthWrapper>
  );
}

