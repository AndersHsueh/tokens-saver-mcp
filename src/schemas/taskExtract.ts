import { z } from "zod";

const TaskStatus = z.enum(["todo", "doing", "blocked", "done", "unknown"]);

const TaskSchema = z.object({
  title: z.string().describe("Actionable task title (verb phrase)"),
  owner: z.string().nullable().optional().describe("Responsible person, null if not mentioned"),
  due: z.string().nullable().optional().describe("Due date string, null if not mentioned"),
  status: TaskStatus.describe("Task status"),
  notes: z.string().nullable().optional().describe("Additional context from the text"),
});

export const TaskExtractInputSchema = z.object({
  text: z.string().min(1).describe("Source text to extract tasks from"),
  task_granularity: z
    .enum(["coarse", "normal", "fine"])
    .describe("Level of task granularity: coarse (high-level), normal, or fine (atomic steps)"),
});

export const TaskExtractOutputSchema = z.object({
  tasks: z.array(TaskSchema).describe("Extracted actionable tasks"),
});

export type TaskExtractInput = z.infer<typeof TaskExtractInputSchema>;
export type TaskExtractOutput = z.infer<typeof TaskExtractOutputSchema>;
