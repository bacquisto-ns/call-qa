
'use client';

import type { EvaluateCallQualityOutput } from '@/ai/flows/evaluate-call-quality';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, MessageSquare, Smile, ShieldCheck, Clock, Star } from 'lucide-react'; // Relevant icons

interface EvaluationResultsProps {
  transcription: string | null;
  evaluation: EvaluateCallQualityOutput | null;
  audioUrl: string | null;
  isLoading: boolean;
}

const MetricDisplay = ({ icon: Icon, label, score }: { icon: React.ElementType; label: string; score: number | undefined }) => {
  const scoreValue = score ?? 0;
  const maxScore = 5;
  const percentage = (scoreValue / maxScore) * 100;

  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default";
  if (scoreValue >= 4) badgeVariant = "default"; // Consider teal (accent) for high scores
  else if (scoreValue >= 2) badgeVariant = "secondary"; // Soft blue for mid
  else badgeVariant = "destructive"; // Red for low

  return (
    <div className="flex items-center space-x-3 py-2">
      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant={badgeVariant} className="text-xs">
             {scoreValue.toFixed(1)} / {maxScore}
          </Badge>
        </div>
        <Progress value={percentage} className="h-1.5" aria-label={`${label} score: ${scoreValue} out of ${maxScore}`} />
      </div>
    </div>
  );
};


export default function EvaluationResults({ transcription, evaluation, audioUrl, isLoading }: EvaluationResultsProps) {

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="space-y-3 pt-4">
             {[...Array(6)].map((_, i) => (
               <div key={i} className="flex items-center space-x-3 py-2">
                  <div className="h-5 w-5 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                     <div className="h-3 bg-muted rounded w-1/3"></div>
                     <div className="h-1.5 bg-muted rounded w-full"></div>
                  </div>
                  <div className="h-5 w-10 bg-muted rounded-full"></div>
               </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }


  if (!evaluation || !transcription) {
     // Display a message or placeholder if no evaluation is available yet
     return (
       <Card className="w-full shadow-lg">
         <CardHeader>
           <CardTitle>Awaiting Evaluation</CardTitle>
           <CardDescription>Upload a call recording to see the evaluation results here.</CardDescription>
         </CardHeader>
         <CardContent>
           <p className="text-center text-muted-foreground py-8">No evaluation data available.</p>
         </CardContent>
       </Card>
     );
   }


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
