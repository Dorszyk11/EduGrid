import { z } from "zod";
import { ValidationError } from "@/lib/errors";

/**
 * Validates input against a Zod schema, throws ValidationError on failure.
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const field = firstIssue?.path?.join(".") || null;
    throw new ValidationError(
      firstIssue?.message || "Validation failed",
      field,
    );
  }
  return result.data;
}

/**
 * Validates and executes a use case function.
 */
export async function validateAndExecute<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  data: unknown,
  execute: (input: TInput) => Promise<TOutput>,
): Promise<TOutput> {
  const validatedInput = validateInput(schema, data);
  return execute(validatedInput);
}
