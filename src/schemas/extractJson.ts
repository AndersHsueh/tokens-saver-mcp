import { z } from "zod";

export const ExtractJsonInputSchema = z.object({
  text: z.string().min(1).describe("Source text to extract data from"),
  schema_description: z.string().min(1).describe("Description of the fields to extract"),
  extraction_goal: z.string().min(1).describe("What extraction goal or use case"),
});

export const ExtractJsonOutputSchema = z.object({
  data: z.record(z.unknown()).describe("Extracted fields as a JSON object"),
  missing_fields: z.array(z.string()).describe("Fields that could not be found"),
});

export type ExtractJsonInput = z.infer<typeof ExtractJsonInputSchema>;
export type ExtractJsonOutput = z.infer<typeof ExtractJsonOutputSchema>;
