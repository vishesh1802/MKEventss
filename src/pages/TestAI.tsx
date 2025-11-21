/**
 * Test Page for OpenRouter API
 * 
 * Visit: http://localhost:3000/test-ai
 * 
 * This page helps you verify your OpenRouter API key is working
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { enhanceWithAI } from "@/utils/ai";

const TestAI = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    model: string;
    response: string;
    usage?: any;
  } | null>(null);
  const [testEvent, setTestEvent] = useState({
    title: "Jazz Night",
    genre: "Music",
    date: "2025-10-15",
    venue_name: "Downtown Jazz Club",
    price: 25,
  });

  const testAction = async (action: string) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await enhanceWithAI({
        action: action as any,
        eventData: testEvent,
        userPreferences: { genres: ["Music"] },
        question: action === "answer_question" ? "What should I wear to this event?" : undefined,
      });

      if (response) {
        setResult({
          model: response.model || "unknown",
          response: response.response,
          usage: response.usage,
        });

        const isWorking = response.model !== "mock";
        if (isWorking) {
          toast.success("✅ API key is working! Real AI response received.");
        } else {
          toast.warning("⚠️ Getting mock response. API key may not be set.");
        }
      } else {
        toast.error("Failed to get response");
      }
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const isWorking = result?.model !== "mock" && result?.model !== undefined;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              OpenRouter API Test Page
              {result && (
                <Badge variant={isWorking ? "default" : "destructive"}>
                  {isWorking ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Working
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Mock Mode
                    </>
                  )}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Test if your OpenRouter API key is working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Event Data */}
            <div className="space-y-4">
              <Label>Test Event Data</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={testEvent.title}
                    onChange={(e) =>
                      setTestEvent({ ...testEvent, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={testEvent.genre}
                    onChange={(e) =>
                      setTestEvent({ ...testEvent, genre: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    value={testEvent.date}
                    onChange={(e) =>
                      setTestEvent({ ...testEvent, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    value={testEvent.venue_name}
                    onChange={(e) =>
                      setTestEvent({ ...testEvent, venue_name: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Test Buttons */}
            <div className="space-y-2">
              <Label>Test Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => testAction("generate_description")}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Generate Description
                </Button>
                <Button
                  onClick={() => testAction("personalized_summary")}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Personalized Summary
                </Button>
                <Button
                  onClick={() => testAction("answer_question")}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Answer Question
                </Button>
                <Button
                  onClick={() => testAction("recommendation_explanation")}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Recommendation Explanation
                </Button>
              </div>
            </div>

            {/* Results */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Model</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="px-2 py-1 bg-muted rounded text-sm">
                        {result.model}
                      </code>
                      {isWorking ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Real AI
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Mock Response
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Response</Label>
                    <Textarea
                      value={result.response}
                      readOnly
                      className="mt-1 min-h-[100px] font-mono text-sm"
                    />
                  </div>

                  {result.usage && (
                    <div>
                      <Label>Token Usage</Label>
                      <div className="mt-1 p-3 bg-muted rounded text-sm space-y-1">
                        <div>Prompt tokens: {result.usage.prompt_tokens || 0}</div>
                        <div>Completion tokens: {result.usage.completion_tokens || 0}</div>
                        <div>Total tokens: {result.usage.total_tokens || 0}</div>
                      </div>
                    </div>
                  )}

                  {!isWorking && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        ⚠️ API Key Not Working
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        You're getting mock responses. Check:
                      </p>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 list-disc list-inside space-y-1">
                        <li>Is .env.local file in the root directory?</li>
                        <li>Did you restart the dev server after adding the key?</li>
                        <li>Is the API key correct? (starts with sk-or-v1-)</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestAI;


