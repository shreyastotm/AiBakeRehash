// ---------------------------------------------------------------------------
// Import/Export model types
// ---------------------------------------------------------------------------

import { RecipeSourceType, RecipeStatus, SectionType } from './recipe.model';

// ---------------------------------------------------------------------------
// Export format
// ---------------------------------------------------------------------------

export interface RecipeExportData {
  aibake_version: string;
  exported_at: string;
  recipe: {
    title: string;
    description: string | null;
    source_type: RecipeSourceType;
    source_url: string | null;
    original_author: string | null;
    servings: number;
    yield_weight_grams: number;
    preferred_unit_system: string;
    status: RecipeStatus;
    ingredients: ExportIngredient[];
    sections: ExportSection[];
  };
}

export interface ExportIngredient {
  display_name: string;
  quantity_original: number;
  unit_original: string;
  quantity_grams: number;
  position: number;
  is_flour: boolean;
  is_liquid: boolean;
}

export interface ExportSection {
  type: SectionType;
  title: string | null;
  position: number;
  steps: ExportStep[];
}

export interface ExportStep {
  instruction: string;
  duration_seconds: number | null;
  temperature_celsius: number | null;
  position: number;
}

// ---------------------------------------------------------------------------
// Bulk export
// ---------------------------------------------------------------------------

export interface BulkExportData {
  aibake_version: string;
  exported_at: string;
  count: number;
  recipes: RecipeExportData['recipe'][];
}

// ---------------------------------------------------------------------------
// Import input
// ---------------------------------------------------------------------------

export interface RecipeImportInput {
  recipe: {
    title: string;
    description?: string | null;
    source_type?: RecipeSourceType;
    source_url?: string | null;
    original_author?: string | null;
    servings: number;
    yield_weight_grams: number;
    preferred_unit_system?: string;
    status?: RecipeStatus;
    ingredients?: ImportIngredient[];
    sections?: ImportSection[];
  };
}

export interface ImportIngredient {
  display_name: string;
  quantity_original: number;
  unit_original: string;
  quantity_grams: number;
  position: number;
  is_flour?: boolean;
  is_liquid?: boolean;
}

export interface ImportSection {
  type: SectionType;
  title?: string | null;
  position: number;
  steps?: ImportStep[];
}

export interface ImportStep {
  instruction: string;
  duration_seconds?: number | null;
  temperature_celsius?: number | null;
  position: number;
}

// ---------------------------------------------------------------------------
// URL import
// ---------------------------------------------------------------------------

export interface UrlImportInput {
  url: string;
}

export interface UrlImportResult {
  recipe: RecipeImportInput['recipe'];
  source_url: string;
  source_author: string | null;
  images: string[];
  parse_warnings: string[];
}

// ---------------------------------------------------------------------------
// Export formats
// ---------------------------------------------------------------------------

export type ExportFormat = 'json' | 'pdf' | 'markdown' | 'jsonld';

export interface MarkdownExportResult {
  content: string;
  filename: string;
}

export interface PdfExportResult {
  content: string;
  filename: string;
}

export interface JsonLdExportResult {
  data: Record<string, unknown>;
  filename: string;
}
