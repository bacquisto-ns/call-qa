
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'; // Added updateDoc
import { db } from '@/lib/firebase/client';
import { listAgents } from '@/lib/firebase/agents'; // Added
import type { Agent } from '@/lib/types'; // Added
import AuthWrapper from '@/components/AuthWrapper';
import FileUpload from '@/components/FileUpload';
import EvaluationResults from '@/components/EvaluationResults';
import type { EvaluateCallQualityOutput } from '@/ai/flows/evaluate-call-quality';
import { evaluateCallQuality } from '@/ai/flows/evaluate-call-quality';
import { transcribeAudioFlow } from '@/ai/flows/transcribe-audio';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // For initial loading

interface CallData {
  id: string;
  fileName: string;
  storageUrl: string;
  status: 'uploaded' | 'fetching' | 'transcribing' | 'evaluating' | 'updating' | 'completed' | 'failed';
  transcription?: string;
  evaluation?: EvaluateCallQualityOutput;
  createdAt: any; // Firestore timestamp type can be complex
  error?: string;
  userId?: string; // Keep track of who uploaded
  agentId?: string;
}

export default function Home() {
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Consolidated loading state
  const [agents, setAgents] = useState<Agent[]>([]); // Added agents state
  const { toast } = useToast();

  // Fetch agents on component mount
  useEffect(() => {
    const fetchAgentsList = async () => {
      try {
        const fetchedAgents = await listAgents();
        setAgents(fetchedAgents);
        console.log("Fetched agents:", fetchedAgents);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
        toast({
          title: "Error Fetching Agents",
          description: "Could not load the list of agents. Please try refreshing.",
          variant: "destructive",
        });
      }
    };
    fetchAgentsList();
  }, [toast]); // toast is a stable dependency from useToast

  // Function to update Firestore status
  const updateCallStatus = async (callId: string, status: CallData['status'], data: Partial<Omit<CallData, 'id'>> = {}) => {
      console.log(`Updating call ${callId} status to: ${status}`, data);
      setCurrentCall(prev => prev && prev.id === callId ? { ...prev, status, ...data } : prev); // Optimistic UI update
      try {
          const callDocRef = doc(db, 'calls', callId);
          await updateDoc(callDocRef, { status, ...data });
          console.log(`Firestore updated for call ${callId} with status ${status}`);
      } catch (error) {
          console.error(`Failed to update Firestore status for call ${callId} to ${status}:`, error);
          // Optionally revert optimistic update or show specific error
           toast({
               title: "Database Update Failed",
               description: `Could not update status to ${status}.`,
               variant: "destructive",
           });
      }
  };


  const processCall = useCallback(async (callId: string) => {
    console.log(`[processCall] Starting processing for call ID: ${callId}`);
    setIsLoading(true);
    await updateCallStatus(callId, 'fetching'); // Indicate fetching data

    try {
      const callDocRef = doc(db, 'calls', callId);
      const callSnap = await getDoc(callDocRef);

      if (!callSnap.exists()) {
        console.error(`[processCall] Error: Call document ${callId} not found.`);
        throw new Error("Call document not found after upload.");
      }

      const callData = { id: callSnap.id, ...callSnap.data() } as CallData;
      console.log(`[processCall] Fetched call data for ${callId}:`, callData);
      setCurrentCall(callData); // Update state with fetched data

      const storageUrl = callData.storageUrl;
      if (!storageUrl) {
         console.error(`[processCall] Error: Storage URL not found in call data for ${callId}.`);
         throw new Error("Storage URL not found in call data.");
      }

      // 1. Transcription
      console.log(`[processCall] Starting transcription for ${callId} (URL: ${storageUrl})`);
      await updateCallStatus(callId, 'transcribing');
      const transcriptionResult = await transcribeAudioFlow({ storageUrl });
      const transcription = transcriptionResult.transcription;
      console.log(`[processCall] Transcription completed for ${callId}. Result:`, transcription);
      // Update status and transcription in Firestore and state
      await updateCallStatus(callId, 'evaluating', { transcription });


      // 2. Evaluation
      console.log(`[processCall] Starting evaluation for ${callId}`);
       const evaluationResult = await evaluateCallQuality({ audioStorageUrl: storageUrl });
      console.log(`[processCall] Evaluation completed for ${callId}. Result:`, evaluationResult);
      // Update status and evaluation in Firestore and state
      await updateCallStatus(callId, 'updating', { evaluation: evaluationResult }); // Indicate final update


      // 3. Final Update
       await updateCallStatus(callId, 'completed'); // Mark as fully completed
      console.log(`[processCall] Processing successfully completed for ${callId}.`);

      toast({
        title: "Processing Complete",
        description: `Evaluation finished for ${callData.fileName}.`,
      });

    } catch (error: any) {
       console.error(`[processCall] Error processing call ${callId}:`, error);
       const errorMessage = error.message || 'An unknown error occurred during processing.';
       await updateCallStatus(callId, 'failed', { error: errorMessage }); // Update status and error
       toast({
         title: "Processing Failed",
         description: errorMessage,
         variant: "destructive",
       });
    } finally {
      console.log(`[processCall] Finished processing attempt for ${callId}`);
      setIsLoading(false);
    }
  }, [toast]); // Removed updateCallStatus from dependencies as it's stable


  const handleUploadSuccess = useCallback(async (callId: string, agentId?: string) => {
    console.log(`[handleUploadSuccess] Upload successful, received call ID: ${callId}, Agent ID: ${agentId}`);
    setIsLoading(true);
    setCurrentCall(null);
    const callDocRef = doc(db, 'calls', callId);

    try {
      // If agentId is provided, update the document first.
      // This assumes the document is already created by FileUpload component or a similar mechanism.
      if (agentId) {
        console.log(`[handleUploadSuccess] Updating call ${callId} with agentId: ${agentId}`);
        await updateDoc(callDocRef, { agentId: agentId });
        console.log(`[handleUploadSuccess] Firestore updated for call ${callId} with agentId.`);
      }

      const docSnap = await getDoc(callDocRef);
      if (docSnap.exists()) {
        const initialData = { id: docSnap.id, ...(docSnap.data() as Omit<CallData, 'id'>) };
        // Ensure agentId from the update is reflected if it was just set
        if (agentId && !initialData.agentId) {
            initialData.agentId = agentId;
        }
        console.log("[handleUploadSuccess] Fetched initial data:", initialData);
        setCurrentCall({ ...initialData, status: 'uploaded' });
        processCall(callId); // Start the main processing flow
      } else {
        console.error("[handleUploadSuccess] Error: Uploaded document not found for ID:", callId);
        toast({ title: "Error", description: "Could not find the uploaded call record.", variant: "destructive" });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[handleUploadSuccess] Error during post-upload processing:", error);
      toast({ title: "Upload Error", description: `Failed to process upload for ${callId}. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
      setIsLoading(false);
      // Attempt to update status to failed if possible
      try {
        await updateCallStatus(callId, 'failed', { error: `Post-upload processing error: ${error instanceof Error ? error.message : String(error)}` });
      } catch (statusUpdateError) {
        console.error("[handleUploadSuccess] Error updating call status to failed after post-upload error:", statusUpdateError);
      }
    }
  }, [processCall, toast]); // processCall and toast are dependencies


   // Optional: Real-time listener to observe changes made by backend/processCall
   useEffect(() => {
     if (!currentCall?.id) return;

     console.log(`[useEffect Listener] Setting up listener for call ID: ${currentCall.id}`);
     const unsub = onSnapshot(doc(db, "calls", currentCall.id), (docSnap) => {
       if (docSnap.exists()) {
         const data = { id: docSnap.id, ...docSnap.data() } as CallData;
         console.log(`[useEffect Listener] Received update for ${data.id}: Status = ${data.status}`, data);
         setCurrentCall(data); // Update state with the latest data from Firestore
         // Update loading state based on Firestore status
         setIsLoading(['fetching', 'transcribing', 'evaluating', 'updating'].includes(data.status));

         // No need to show toast here for failed, processCall handles it.
         // if (data.status === 'failed' && data.error !== currentCall?.error) { // Avoid duplicate toasts
         //    toast({ title: "Processing Failed", description: data.error || "An unknown error occurred.", variant: "destructive" });
         // }

       } else {
         console.log(`[useEffect Listener] Call document ${currentCall.id} deleted or does not exist.`);
         // Optionally clear the state if the document is gone
         // setCurrentCall(null);
       }
     }, (error) => {
         console.error(`[useEffect Listener] Error listening to call ${currentCall.id}:`, error);
         toast({ title: "Real-time Update Error", description: "Could not listen for call updates.", variant: "destructive"});
     });

     // Cleanup listener on component unmount or when currentCall.id changes
     return () => {
        console.log(`[useEffect Listener] Cleaning up listener for call ID: ${currentCall?.id}`);
        unsub();
     };
   }, [currentCall?.id, toast]); // Re-run if call ID changes


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
                    <CardDescription>Select an MP3 file and optionally assign an agent.</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <FileUpload onUploadSuccess={handleUploadSuccess} disabled={isLoading} agents={agents} />
                 </CardContent>
              </Card>
               {/* Display current status */}
              {currentCall && (
                  <Card className="mt-4">
                      <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Current Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p className="text-sm capitalize text-muted-foreground">
                              File: <span className="font-medium text-foreground">{currentCall.fileName || 'N/A'}</span>
                          </p>
                          <p className="text-sm capitalize text-muted-foreground">
                              Status: <span className="font-medium text-foreground">{currentCall.status}</span>
                               {isLoading && <span className="animate-pulse">...</span>}
                          </p>
                          {currentCall.status === 'failed' && (
                              <p className="text-sm text-destructive mt-1">
                                  Error: {currentCall.error}
                              </p>
                          )}
                      </CardContent>
                  </Card>
              )}
           </div>


           <div className="md:col-span-2">
             <EvaluationResults
               transcription={currentCall?.transcription ?? null}
               evaluation={currentCall?.evaluation ?? null}
               audioUrl={currentCall?.storageUrl ?? null}
               isLoading={isLoading} // Use the consolidated loading state
               status={currentCall?.status ?? null} // Pass status for more specific feedback
             />
             {/* Moved failure display to the status card on the left */}
           </div>
         </div>
         <Toaster />
       </div>
     </AuthWrapper>
  );
}

