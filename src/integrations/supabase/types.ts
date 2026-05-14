export interface SupabaseConfig {
  url: string;
  serviceKey: string;
}

export interface OpenApiProperty {
  type?: string;
  format?: string;
  description?: string;
}

export interface OpenApiDefinition {
  properties?: Record<string, OpenApiProperty>;
  required?: string[];
}

/** Handles both Swagger 2.0 (definitions) and OpenAPI 3.0 (components.schemas) */
export interface OpenApiSpec {
  swagger?: string;
  openapi?: string;
  definitions?: Record<string, OpenApiDefinition>;
  components?: {
    schemas?: Record<string, OpenApiDefinition>;
  };
}
