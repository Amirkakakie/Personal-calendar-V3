import { GoogleGenAI, Type } from '@google/genai';
import type { Task, GoalOKR, AIProductivityBrief, TaskCategory, EisenhowerQuadrant } from '../../src/types/index.ts';
import { withExponentialBackoff } from './googleCalendarService.ts';

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 25000, operationName = 'Gemini API call'): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

export interface DecompositionTaskItem {
  title: string;
  category: TaskCategory;
  priority: 'High' | 'Medium' | 'Low';
  eisenhower: EisenhowerQuadrant;
  durationMinutes: number;
  subtasks: string[];
}

export interface DecompositionResult {
  goalTitle: string;
  category: TaskCategory;
  eisenhower: EisenhowerQuadrant;
  totalEstimatedHours: number;
  tasks: DecompositionTaskItem[];
  subtasks: {
    title: string;
    description: string;
    estimatedMinutes: number;
    priority: 'High' | 'Medium' | 'Low';
    eisenhower: EisenhowerQuadrant;
  }[];
  recommendations: string[];
  source?: 'gemini' | 'heuristic_engine';
  modelUsed?: string;
}

export class GeminiProductivityService {
  /**
   * Intelligently decompose a complex or vague goal into structured action items
   */
  async decomposeGoal(goalTitle: string, context?: string, preferredCategory?: TaskCategory): Promise<DecompositionResult> {
    const prompt = `You are a Principal Productivity Engineer and Executive Coach.
Deconstruct the following high-level objective into 4 to 6 concrete, sequential, actionable engineering/study/habit action items.
Goal: "${goalTitle}"
Additional Context: "${context || 'No additional context provided'}"
Preferred Category: "${preferredCategory || 'Academic/Study'}"

Return structured JSON with:
- goalTitle
- category (One of: "Work/Career", "Academic/Study", "Personal Growth", "Health & Habits")
- eisenhower (One of: "q1_urgent_important", "q2_not_urgent_important", "q3_urgent_not_important", "q4_neither")
- totalEstimatedHours (number)
- tasks: array of objects { title, category, priority ("High"|"Medium"|"Low"), eisenhower, durationMinutes, subtasks: string[] }
- subtasks: array of objects { title, description, estimatedMinutes, priority ("High"|"Medium"|"Low"), eisenhower }
- recommendations: array of 2-3 concise expert tips for execution`;

    try {
      const client = getGeminiClient();
      if (!client) throw new Error('GEMINI_API_KEY not configured');

      const model = getGeminiModel();
      return await withExponentialBackoff(async () => {
        const response = await withTimeout(
          client.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: 'You are an elite productivity systems architect who breaks large goals into atomic, actionable steps.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
              properties: {
                goalTitle: { type: Type.STRING },
                category: { type: Type.STRING },
                eisenhower: { type: Type.STRING },
                totalEstimatedHours: { type: Type.NUMBER },
                tasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      eisenhower: { type: Type.STRING },
                      durationMinutes: { type: Type.INTEGER },
                      subtasks: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    },
                    required: ['title', 'durationMinutes', 'priority', 'eisenhower']
                  }
                },
                subtasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      estimatedMinutes: { type: Type.INTEGER },
                      priority: { type: Type.STRING },
                      eisenhower: { type: Type.STRING }
                    },
                    required: ['title', 'estimatedMinutes', 'priority', 'eisenhower']
                  }
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['goalTitle', 'category', 'eisenhower', 'totalEstimatedHours', 'tasks', 'subtasks', 'recommendations']
            }
          }
        }),
        25000,
        'decomposeGoal'
      );

        const parsed = JSON.parse(response.text || '{}');
        const resolvedCategory = (parsed.category as TaskCategory) || preferredCategory || 'Academic/Study';

        // Ensure tasks is populated even if subtasks were primary
        let formattedTasks: DecompositionTaskItem[] = [];
        if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
          formattedTasks = parsed.tasks.map((t: any) => ({
            title: t.title,
            category: (t.category as TaskCategory) || resolvedCategory,
            priority: (t.priority as any) || 'Medium',
            eisenhower: (t.eisenhower as any) || 'q2_not_urgent_important',
            durationMinutes: Number(t.durationMinutes) || 45,
            subtasks: Array.isArray(t.subtasks) ? t.subtasks : []
          }));
        } else if (Array.isArray(parsed.subtasks)) {
          formattedTasks = parsed.subtasks.map((st: any) => ({
            title: st.title,
            category: resolvedCategory,
            priority: (st.priority as any) || 'Medium',
            eisenhower: (st.eisenhower as any) || 'q2_not_urgent_important',
            durationMinutes: Number(st.estimatedMinutes) || 45,
            subtasks: st.description ? [st.description] : []
          }));
        }

        return {
          goalTitle: parsed.goalTitle || goalTitle,
          category: resolvedCategory,
          eisenhower: (parsed.eisenhower as EisenhowerQuadrant) || 'q2_not_urgent_important',
          totalEstimatedHours: Number(parsed.totalEstimatedHours) || 8,
          tasks: formattedTasks,
          subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          source: 'gemini',
          modelUsed: model
        };
      }, 3, 600);
    } catch (error) {
      console.warn('[GeminiProductivityService] Goal decomposition fallback triggered:', error);
      const cat = preferredCategory || 'Work/Career';
      return {
        goalTitle,
        category: cat,
        eisenhower: 'q2_not_urgent_important',
        totalEstimatedHours: 6.5,
        tasks: [
          {
            title: `Scope Requirements & Foundation for "${goalTitle}"`,
            category: cat,
            priority: 'High',
            eisenhower: 'q2_not_urgent_important',
            durationMinutes: 45,
            subtasks: ['Define exact milestones', 'Catalog required resources', 'Establish metric of success']
          },
          {
            title: 'Core Implementation / Deep Study Sprint 1',
            category: cat,
            priority: 'High',
            eisenhower: 'q2_not_urgent_important',
            durationMinutes: 90,
            subtasks: ['Focus block on core architectural concepts', 'Write initial prototypes']
          },
          {
            title: 'Hands-on Exercise & Lab Validation',
            category: cat,
            priority: 'Medium',
            eisenhower: 'q2_not_urgent_important',
            durationMinutes: 75,
            subtasks: ['Execute integration tests', 'Profile performance bottlenecks']
          },
          {
            title: 'Refinement, Review & Documentation',
            category: cat,
            priority: 'Medium',
            eisenhower: 'q3_urgent_not_important',
            durationMinutes: 45,
            subtasks: ['Document lessons learned', 'Prepare next sprint roadmap']
          }
        ],
        subtasks: [
          {
            title: `Scope Requirements & Foundation for "${goalTitle}"`,
            description: 'Define exact milestones, resources, prerequisites, and evaluation criteria.',
            estimatedMinutes: 45,
            priority: 'High',
            eisenhower: 'q2_not_urgent_important'
          },
          {
            title: 'Core Implementation / Deep Study Sprint 1',
            description: 'Focus block on fundamental concepts or architecture scaffolding.',
            estimatedMinutes: 90,
            priority: 'High',
            eisenhower: 'q2_not_urgent_important'
          },
          {
            title: 'Hands-on Exercise & Lab Validation',
            description: 'Build working prototype, write unit test cases or solve problem sets.',
            estimatedMinutes: 75,
            priority: 'Medium',
            eisenhower: 'q2_not_urgent_important'
          },
          {
            title: 'Refinement, Review & Documentation',
            description: 'Document key learnings, fix edge-case bugs, and synthesize notes.',
            estimatedMinutes: 45,
            priority: 'Medium',
            eisenhower: 'q3_urgent_not_important'
          }
        ],
        recommendations: [
          'Utilize 25-minute Pomodoro intervals to prevent cognitive fatigue.',
          'Schedule deep-work blocks during your peak morning alertness window.',
          'Review progress against your quarterly OKRs at the end of each sprint.'
        ],
        source: 'heuristic_engine'
      };
    }
  }

  /**
   * Generates Daily AI Briefing & Adaptive Schedule based on existing tasks and energy
   */
  async generateDailyBriefing(
    tasks: Task[],
    goals: GoalOKR[],
    energyLevel: 'High' | 'Medium' | 'Low' = 'High'
  ): Promise<AIProductivityBrief> {
    const pendingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 10);
    const completedToday = tasks.filter(t => t.status === 'completed').slice(0, 5);

    const prompt = `Analyze this user's current workload and build an optimized schedule.
User's Self-Reported Energy: ${energyLevel}
Completed Today (${completedToday.length}): ${completedToday.map(t => t.title).join(', ') || 'None yet'}
Pending Tasks (${pendingTasks.length}):
${pendingTasks.map(t => `- [${t.category}] [Priority: ${t.priority}] [Quadrant: ${t.eisenhower}] "${t.title}" (${t.durationMinutes}m)`).join('\n')}

Active Goals:
${goals.map(g => `- [${g.category}] ${g.title} (${g.progressPercent}% complete)`).join('\n')}

Generate:
1. Executive summary of current momentum and focus
2. Burnout risk assessment ("Low" | "Moderate" | "High")
3. Suggested time-block schedule for the remaining day or tomorrow
4. 3 strategic high-leverage coaching recommendations
5. 1 sharp, inspiring quote relevant to deep focus and grit`;

    try {
      const client = getGeminiClient();
      if (!client) throw new Error('GEMINI_API_KEY not configured');

      const model = getGeminiModel();
      return await withExponentialBackoff(async () => {
        const response = await withTimeout(
          client.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: 'You are an executive performance and cognitive load specialist. You construct realistic, rhythm-aligned daily plans that maximize focus without inducing burnout.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  burnoutRisk: { type: Type.STRING },
                  recommendedSchedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timeSlot: { type: Type.STRING },
                        suggestedTaskTitle: { type: Type.STRING },
                        category: { type: Type.STRING },
                        reason: { type: Type.STRING }
                      },
                      required: ['timeSlot', 'suggestedTaskTitle', 'category', 'reason']
                    }
                  },
                  strategicAdvice: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  motivationalQuote: { type: Type.STRING }
                },
                required: ['summary', 'burnoutRisk', 'recommendedSchedule', 'strategicAdvice', 'motivationalQuote']
              }
            }
          }),
          25000,
          'generateDailyBriefing'
        );

        const parsed = JSON.parse(response.text || '{}');
        const recommendedSchedule = Array.isArray(parsed.recommendedSchedule) ? parsed.recommendedSchedule : [];
        return {
          summary: parsed.summary || 'Strong momentum maintained across key objectives.',
          energyLevel,
          burnoutRisk: (parsed.burnoutRisk as any) || 'Low',
          recommendedSchedule,
          suggestedSchedule: recommendedSchedule.map((r: any) => ({
            timeSlot: r.timeSlot,
            recommendedTask: r.suggestedTaskTitle,
            reason: r.reason
          })),
          strategicAdvice: Array.isArray(parsed.strategicAdvice) ? parsed.strategicAdvice : [],
          motivationalQuote: parsed.motivationalQuote || 'Focus is a muscle: the more you protect your attention, the faster your trajectory.'
        };
      }, 3, 600);
    } catch (err) {
      console.warn('[GeminiProductivityService] Briefing fallback triggered:', err);
      const fallbackSchedule = [
        {
          timeSlot: '09:00 - 10:30',
          suggestedTaskTitle: pendingTasks[0]?.title || 'Deep Work Sprint (High Priority)',
          category: pendingTasks[0]?.category || 'Work/Career',
          reason: 'Tackle cognitive-heavy architectural or study tasks while willpower is peak.'
        },
        {
          timeSlot: '11:00 - 12:00',
          suggestedTaskTitle: pendingTasks[1]?.title || 'Secondary Milestone Execution',
          category: pendingTasks[1]?.category || 'Academic/Study',
          reason: 'Follow up with structured problem solving or review.'
        },
        {
          timeSlot: '14:30 - 15:30',
          suggestedTaskTitle: 'Administrative Batching & Communication',
          category: 'Work/Career',
          reason: 'Triage low-cognitive overhead tasks in the post-lunch dip.'
        },
        {
          timeSlot: '17:00 - 17:45',
          suggestedTaskTitle: 'Habit & Physical Recovery',
          category: 'Health & Habits',
          reason: 'Reset neurochemistry and prevent burn-out with movement.'
        }
      ];

      return {
        summary: `You have ${pendingTasks.length} active tasks queued. With ${energyLevel.toLowerCase()} energy, prioritize your Q2 Focus (Important, Not Urgent) tasks during your prime focus window.`,
        energyLevel,
        burnoutRisk: pendingTasks.length > 8 ? 'Moderate' : 'Low',
        recommendedSchedule: fallbackSchedule as any,
        suggestedSchedule: fallbackSchedule.map(s => ({
          timeSlot: s.timeSlot,
          recommendedTask: s.suggestedTaskTitle,
          reason: s.reason
        })),
        strategicAdvice: [
          'Protect 90-minute uninterrupted deep work blocks by silencing notifications.',
          'Align daily tasks directly to your Quarterly OKRs to avoid busywork illusion.',
          'Schedule a hard stop in the evening to allow mental replenishment.'
        ],
        motivationalQuote: 'Simplicity boils down to two steps: Identify the essential. Eliminate the rest.'
      };
    }
  }

  /**
   * Conversational Productivity Coach chat
   */
  async askCoach(userQuestion: string, contextSummary: string): Promise<string> {
    const prompt = `You are the user's Principal AI Productivity Coach & Systems Mentor.
User Context:
${contextSummary}

User's Question/Request:
"${userQuestion}"

Provide an insightful, empathetic, highly actionable response (under 250 words). Include 2 concrete tactics they can apply immediately.`;

    try {
      const client = getGeminiClient();
      if (!client) throw new Error('GEMINI_API_KEY not configured');

      const model = getGeminiModel();
      return await withExponentialBackoff(async () => {
        const response = await withTimeout(
          client.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: 'You are an elite performance coach combining neuroscience, deep work methodology, and agile execution.'
            }
          }),
          25000,
          'askCoach'
        );
        return response.text || 'Keep moving forward with intentional focus.';
      }, 3, 600);
    } catch (error) {
      console.warn('[GeminiProductivityService] Chat coach fallback:', error);
      return `Based on your current priorities, I recommend locking in a single 45-minute sprint on your highest-leverage task. Break any sticking point into the absolute smallest physical action you can execute right now.`;
    }
  }

  /**
   * Real-time streaming conversational coach response
   */
  async *askCoachStream(userQuestion: string, contextSummary: string): AsyncGenerator<string, void, unknown> {
    const prompt = `You are the user's Principal AI Productivity Coach & Systems Mentor.
User Context:
${contextSummary}

User's Question/Request:
"${userQuestion}"

Provide an insightful, empathetic, highly actionable response (under 250 words). Include 2 concrete tactics they can apply immediately.`;

    const client = getGeminiClient();
    if (!client) {
      const fallback = `Based on your current priorities, I recommend locking in a single 45-minute sprint on your highest-leverage task. Break any sticking point into the absolute smallest physical action you can execute right now.`;
      yield fallback;
      return;
    }

    try {
      const model = getGeminiModel();
      const stream = await client.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          systemInstruction: 'You are an elite performance coach combining neuroscience, deep work methodology, and agile execution.'
        }
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      console.warn('[GeminiProductivityService] Stream error, falling back:', error);
      yield `Keep your momentum going. Focus on the immediate next physical milestone and eliminate distractions.`;
    }
  }
}

export const geminiService = new GeminiProductivityService();
