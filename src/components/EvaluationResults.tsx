
'use client';

import type { EvaluateCallQualityOutput } from '@/ai/flows/evaluate-call-quality';
import type { CallData } from '@/app/page'; // Assuming CallData type is exported or defined here
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, MessageSquare, Smile, ShieldCheck, Clock, Star, Loader2, AlertTriangle, UploadCloud } from 'lucide-react'; // Added Loader2, AlertTriangle, UploadCloud

interface EvaluationResultsProps {
  transcription: string | null;
  evaluation: EvaluateCallQualityOutput | null;
  audioUrl: string | null;
  isLoading: boolean;
  status: CallData['status'] | null; // Add status prop
}

const MetricDisplay = ({ icon: Icon, label, score }: { icon: React.ElementType; label: string; score: number | undefined }) => {
  const scoreValue = score ?? 0;
  const maxScore = 5;
  const percentage = (scoreValue / maxScore) * 100;

  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary"; // Default to secondary (mid)
  if (scoreValue >= 4) badgeVariant = "default"; // Good score
  else if (scoreValue < 2) badgeVariant = "destructive"; // Low score

  return (
    <div className="flex items-center space-x-3 py-2">
      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant={badgeVariant} className={`text-xs ${badgeVariant === 'default' ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700' : ''} ${badgeVariant === 'destructive' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700' : ''}`}>
             {scoreValue.toFixed(1)} / {maxScore}
          </Badge>
        </div>
        <Progress value={percentage} className="h-1.5" aria-label={`${label} score: ${scoreValue} out of ${maxScore}`} />
      </div>
    </div>
  );
};


export default function EvaluationResults({ transcription, evaluation, audioUrl, isLoading, status }: EvaluationResultsProps) {

  // Combined Loading State Handling
  if (isLoading || !status || ['fetching', 'transcribing', 'evaluating', 'updating'].includes(status)) {
    let loadingMessage = "Processing...";
    if (status === 'fetching') loadingMessage = "Fetching call data...";
    if (status === 'transcribing') loadingMessage = "Transcribing audio...";
    if (status === 'evaluating') loadingMessage = "Evaluating call quality...";
    if (status === 'updating') loadingMessage = "Saving results...";

    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
             <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
             Processing Call
          </CardTitle>
          <CardDescription>{loadingMessage}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-16">
           <p className="text-muted-foreground">Please wait...</p>
        </CardContent>
      </Card>
    );
  }

  // Initial State / Awaiting Upload
  if (status === 'uploaded' || !evaluation) {
       return (
         <Card className="w-full shadow-lg">
           <CardHeader>
             <CardTitle className="flex items-center">
                <UploadCloud className="mr-2 h-5 w-5 text-primary" />
                Awaiting Evaluation
             </CardTitle>
             <CardDescription>Upload a call recording to see the evaluation results here.</CardDescription>
           </CardHeader>
           <CardContent className="flex items-center justify-center py-16">
             <p className="text-center text-muted-foreground">No evaluation data available yet.</p>
           </CardContent>
         </Card>
       );
  }

   // Failed State
  if (status === 'failed') {
      return (
        <Card className="w-full shadow-lg border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Processing Failed
            </CardTitle>
            <CardDescription>There was an error during the analysis.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-center text-destructive">{evaluation?.error || 'An unknown error occurred.'}</p> {/* Assuming error might be in evaluation */}
          </CardContent>
        </Card>
      );
    }


  // Completed State - Render Results
  if (status === 'completed' && evaluation && transcription) {
      const metrics = [
        { icon: CheckCircle, label: "Greeting Compliance", score: evaluation.greetingCompliance },
        { icon: ShieldCheck, label: "Script Adherence", score: evaluation.scriptAdherence },
        { icon: Smile, label: "Empathy Expression", score: evaluation.empathyExpression },
        { icon: ShieldCheck, label: "Resolution Confirmation", score: evaluation.resolutionConfirmation }, // Reusing icon, adjust if needed
        { icon: Clock, label: "Call Duration", score: evaluation.callDuration },
        { icon: Star, label: "Overall Rating", score: evaluation.overallRating },
      ];

      return (
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>Call Evaluation Results</CardTitle>
            <CardDescription>Detailed analysis of the call recording.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {audioUrl && (
               <div className="mb-4">
                 <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-accent"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
                    Audio Playback
                  </h3>
                 <audio controls className="w-full" src={audioUrl}>
                   Your browser does not support the audio element.
                 </audio>
               </div>
              )}

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                 <MessageSquare className="mr-2 h-5 w-5 text-accent" />
                Transcription
              </h3>
              <ScrollArea className="h-48 w-full rounded-md border p-4 bg-muted/30">
                <p className="text-sm whitespace-pre-wrap">{transcription || "Transcription not available."}</p>
              </ScrollArea>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <Star className="mr-2 h-5 w-5 text-accent" />
                 Evaluation Metrics
               </h3>
              <div className="space-y-1">
                {metrics.map((metric) => (
                  <MetricDisplay key={metric.label} {...metric} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      );
  }

  // Fallback for any unexpected state
  return (
       <Card className="w-full shadow-lg">
         <CardHeader>
           <CardTitle>Evaluation Status Unknown</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-center text-muted-foreground py-8">Could not determine the evaluation status.</p>
         </CardContent>
       </Card>
     );

}
