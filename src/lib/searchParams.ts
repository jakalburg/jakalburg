import { z } from "zod";

export const collectionSearchSchema = z.object({
  size: z.string().optional().catch(undefined),
  color: z.string().optional().catch(undefined),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc"]).optional().catch(undefined),
});

export type CollectionSearchParams = z.infer<typeof collectionSearchSchema>;
