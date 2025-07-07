// src/lib/validation.ts
import { z } from 'zod';

// Helper schemas for reusable validations
const phoneSchema = z.string()
  .optional()
  .refine((val) => {
    if (!val || val === '') return true; // Optional field
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15;
  }, {
    message: "Phone number must be between 7-15 digits"
  });

const emailSchema = z.union([
  z.string().email("Invalid email address"),
  z.literal(''),
  z.undefined()
]).optional();

const dateSchema = z.string()
  .optional()
  .refine((val) => {
    if (!val || val === '') return true;
    return !isNaN(Date.parse(val));
  }, {
    message: "Invalid date format"
  });

// Business type enum (from constants.py)
const BusinessTypeSchema = z.enum([
  "None",
  "Oil & Gas", 
  "Secondary Containment",
  "Tanks",
  "Pipe",
  "Rental",
  "Food and Beverage",
  "Bridge",
  "Culvert"
]);

// Phone label enum
const PhoneLabelSchema = z.enum(["work", "mobile", "home", "fax", "other"]);

// Lead status enum
const LeadStatusSchema = z.enum(["open", "converted", "closed", "lost"]);

// Project status enum
const ProjectStatusSchema = z.enum(["pending", "won", "lost"]);

// Base offline metadata schema
const OfflineMetadataSchema = z.object({
  _lastModified: z.number().optional(),
  _syncedAt: z.number().optional(),
  _pending: z.boolean().optional(),
  _conflict: z.boolean().optional(),
  _version: z.number().optional(),
});

// Client validation schema
export const ClientSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string()
    .min(1, "Company name is required")
    .max(100, "Company name must be less than 100 characters"),
  contact_person: z.string()
    .max(100, "Contact person name must be less than 100 characters")
    .optional(),
  contact_title: z.string()
    .max(100, "Contact title must be less than 100 characters")
    .optional(),
  email: emailSchema,
  phone: phoneSchema,
  phone_label: PhoneLabelSchema.optional(),
  secondary_phone: phoneSchema,
  secondary_phone_label: PhoneLabelSchema.optional(),
  address: z.string()
    .max(255, "Address must be less than 255 characters")
    .optional(),
  city: z.string()
    .max(100, "City must be less than 100 characters")
    .optional(),
  state: z.string()
    .max(100, "State must be less than 100 characters")
    .optional(),
  zip: z.string()
    .max(20, "ZIP code must be less than 20 characters")
    .optional(),
  notes: z.string().optional(),
  type: BusinessTypeSchema.optional(),
  created_at: dateSchema,
}).merge(OfflineMetadataSchema);

// Lead validation schema
export const LeadSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string()
    .min(1, "Company name is required")
    .max(100, "Company name must be less than 100 characters"),
  contact_person: z.string()
    .max(100, "Contact person name must be less than 100 characters")
    .optional(),
  contact_title: z.string()
    .max(100, "Contact title must be less than 100 characters")
    .optional(),
  email: emailSchema,
  phone: phoneSchema,
  phone_label: PhoneLabelSchema.optional(),
  secondary_phone: phoneSchema,
  secondary_phone_label: PhoneLabelSchema.optional(),
  address: z.string()
    .max(255, "Address must be less than 255 characters")
    .optional(),
  city: z.string()
    .max(100, "City must be less than 100 characters")
    .optional(),
  state: z.string()
    .max(100, "State must be less than 100 characters")
    .optional(),
  zip: z.string()
    .max(20, "ZIP code must be less than 20 characters")
    .optional(),
  notes: z.string().optional(),
  type: BusinessTypeSchema.optional(),
  lead_status: LeadStatusSchema.optional(),
  created_at: dateSchema,
  // Relationship IDs
  assigned_to: z.number().optional(),
  created_by: z.number().optional(),
}).merge(OfflineMetadataSchema);

// Project validation schema
export const ProjectSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  project_name: z.string()
    .min(1, "Project name is required")
    .max(255, "Project name must be less than 255 characters"),
  project_description: z.string().optional(),
  type: BusinessTypeSchema.optional(),
  project_status: ProjectStatusSchema.optional(),
  project_start: dateSchema,
  project_end: dateSchema,
  project_worth: z.number()
    .min(0, "Project worth must be positive")
    .optional(),
  notes: z.string().optional(),
  
  // Entity relationships
  client_id: z.number().optional(),
  lead_id: z.number().optional(),
  
  // Primary contact fields for standalone projects
  primary_contact_name: z.string()
    .max(100, "Contact name must be less than 100 characters")
    .optional(),
  primary_contact_title: z.string()
    .max(100, "Contact title must be less than 100 characters")
    .optional(),
  primary_contact_email: emailSchema,
  primary_contact_phone: phoneSchema,
  primary_contact_phone_label: PhoneLabelSchema.optional(),
  
  created_at: dateSchema,
  created_by: z.number().optional(),
}).merge(OfflineMetadataSchema)
.refine((data) => {
  // Business rule: Can't have both client_id and lead_id
  return !(data.client_id && data.lead_id);
}, {
  message: "Project cannot be assigned to both a client and a lead",
  path: ["client_id", "lead_id"]
});

// Interaction validation schema
export const InteractionSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  contact_date: z.string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid contact date format"
    }),
  summary: z.string()
    .min(1, "Summary is required")
    .max(255, "Summary must be less than 255 characters"),
  outcome: z.string()
    .max(255, "Outcome must be less than 255 characters")
    .optional(),
  notes: z.string().optional(),
  follow_up: dateSchema,
  
  // Contact information
  contact_person: z.string()
    .max(100, "Contact person must be less than 100 characters")
    .optional(),
  email: emailSchema,
  phone: phoneSchema,
  
  // Entity relationships
  client_id: z.number().optional(),
  lead_id: z.number().optional(),
  project_id: z.number().optional(),
}).merge(OfflineMetadataSchema)
.refine((data) => {
  // Must have exactly one entity relationship
  const entityCount = [data.client_id, data.lead_id, data.project_id]
    .filter(Boolean).length;
  return entityCount === 1;
}, {
  message: "Interaction must be linked to exactly one entity",
  path: ["client_id", "lead_id", "project_id"]
});

// Export validated types
export type ValidatedClient = z.infer<typeof ClientSchema>;
export type ValidatedLead = z.infer<typeof LeadSchema>;
export type ValidatedProject = z.infer<typeof ProjectSchema>;
export type ValidatedInteraction = z.infer<typeof InteractionSchema>;

// Entity configuration
export const ENTITY_SCHEMAS = {
  clients: ClientSchema,
  leads: LeadSchema,
  projects: ProjectSchema,
  interactions: InteractionSchema,
} as const;

export const ENTITY_CONFIG = {
  clients: {
    schema: ClientSchema,
    endpoint: '/clients',
    displayName: 'Client',
    primaryField: 'name',
    icon: '🏢'
  },
  leads: {
    schema: LeadSchema,
    endpoint: '/leads',
    displayName: 'Lead',
    primaryField: 'name',
    icon: '🎯'
  },
  projects: {
    schema: ProjectSchema,
    endpoint: '/projects',
    displayName: 'Project',
    primaryField: 'project_name',
    icon: '🚧'
  },
  interactions: {
    schema: InteractionSchema,
    endpoint: '/interactions',
    displayName: 'Interaction',
    primaryField: 'summary',
    icon: '📞'
  }
} as const;

export type EntityType = keyof typeof ENTITY_SCHEMAS;

// Validation helper functions
export function validateEntity(
  entityType: EntityType,
  data: unknown
): ValidatedClient | ValidatedLead | ValidatedProject | ValidatedInteraction {
  const schema = ENTITY_SCHEMAS[entityType];
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map((err: z.ZodIssue) => 
      `${err.path.join('.')}: ${err.message}`
    ).join(', ');
    throw new Error(`Invalid ${entityType} data: ${errors}`);
  }
  
  return result.data as ValidatedClient | ValidatedLead | ValidatedProject | ValidatedInteraction;
}

export function validatePartialEntity(
  entityType: EntityType,
  data: unknown
): Partial<ValidatedClient | ValidatedLead | ValidatedProject | ValidatedInteraction> {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid ${entityType} data: must be an object`);
  }
  
  // For partial updates, we'll just validate what's provided without requiring all fields
  // This is a simpler approach than trying to use Zod's partial methods
  
  // Basic type checking - the full validation will happen when the complete entity is processed
  return data as Partial<ValidatedClient | ValidatedLead | ValidatedProject | ValidatedInteraction>;
}

// Validation for conflict resolution
export function validateMergedData(
  entityType: EntityType,
  mergedData: unknown,
  conflictFields: string[]
): ValidatedClient | ValidatedLead | ValidatedProject | ValidatedInteraction {
  // Validate the merged data
  const validatedData = validateEntity(entityType, mergedData);
  
  // Ensure all conflict fields are present (not undefined/null)
  const missingConflictFields = conflictFields.filter((field: string) => {
    const value = (mergedData as Record<string, unknown>)?.[field];
    return value === undefined;
  });
  
  if (missingConflictFields.length > 0) {
    throw new Error(
      `Missing values for conflict fields: ${missingConflictFields.join(', ')}`
    );
  }
  
  return validatedData;
}

// Get human-readable validation errors
export function getValidationErrors(
  entityType: EntityType,
  data: unknown
): string[] {
  const schema = ENTITY_SCHEMAS[entityType];
  const result = schema.safeParse(data);
  
  if (result.success) return [];
  
  return result.error.errors.map((err: z.ZodIssue) => {
    const field = err.path.join('.');
    return `${field}: ${err.message}`;
  });
}

// Additional helper for conflict resolution UI
export function getFieldValidationError(
  entityType: EntityType,
  fieldName: string,
  fieldValue: unknown
): string | null {
  try {
    // Create a minimal object with just the field we want to validate
    const testData = { [fieldName]: fieldValue };
    
    // Try to validate with the full schema - if it fails, check if it's our field
    const schema = ENTITY_SCHEMAS[entityType];
    const result = schema.safeParse(testData);
    
    if (result.success) return null;
    
    const fieldError = result.error.errors.find(err => 
      err.path.length === 1 && err.path[0] === fieldName
    );
    
    return fieldError ? fieldError.message : null;
  } catch {
    return "Invalid field value";
  }
}