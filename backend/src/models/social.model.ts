// ---------------------------------------------------------------------------
// Social Media model types
// ---------------------------------------------------------------------------

export type CardFormat = 'instagram_story' | 'instagram_post' | 'whatsapp';
export type CardLanguage = 'en' | 'hi' | 'bilingual';
export type ColorScheme = 'light' | 'dark' | 'custom';

// ---------------------------------------------------------------------------
// Recipe Card
// ---------------------------------------------------------------------------

export interface RecipeCardRequest {
  recipe_id: string;
  format: CardFormat;
  language: CardLanguage;
  include_branding: boolean;
  watermark_text?: string;
  color_scheme?: ColorScheme;
  custom_colors?: {
    background: string;
    text: string;
    accent: string;
  };
}

export interface RecipeCardResult {
  image_url: string;
  width: number;
  height: number;
  format: string;
  file_size_bytes: number;
  recipe_title: string;
  language: CardLanguage;
}

// ---------------------------------------------------------------------------
// Journal Card
// ---------------------------------------------------------------------------

export interface JournalCardRequest {
  journal_entry_id: string;
  hide_private_notes: boolean;
  language: CardLanguage;
  color_scheme?: ColorScheme;
}

export interface JournalCardResult {
  image_url: string;
  shareable_link: string;
  width: number;
  height: number;
  format: string;
  file_size_bytes: number;
  preview_metadata: OpenGraphMetadata;
}

// ---------------------------------------------------------------------------
// WhatsApp Formatting
// ---------------------------------------------------------------------------

export type WhatsAppContentType = 'recipe' | 'shopping_list' | 'inventory_reminder';

export interface WhatsAppFormatRequest {
  recipe_id: string;
  content_type: WhatsAppContentType;
  language: CardLanguage;
  include_image: boolean;
}

export interface WhatsAppFormatResult {
  formatted_text: string;
  shareable_link: string;
  image_url: string | null;
  image_compressed: boolean;
  preview_metadata: OpenGraphMetadata;
}

// ---------------------------------------------------------------------------
// Open Graph Metadata
// ---------------------------------------------------------------------------

export interface OpenGraphMetadata {
  og_title: string;
  og_description: string;
  og_image: string;
  og_url: string;
  og_type: string;
}

// ---------------------------------------------------------------------------
// Social Media Templates
// ---------------------------------------------------------------------------

export interface SocialTemplate {
  id: string;
  name: string;
  description: string;
  format: CardFormat;
  color_scheme: ColorScheme;
  colors: {
    background: string;
    text: string;
    accent: string;
  };
  font: string;
  layout: string;
  is_default: boolean;
  preview_url: string;
}

export interface UserTemplatePreference {
  id: string;
  user_id: string;
  template_id: string;
  custom_colors?: {
    background: string;
    text: string;
    accent: string;
  };
  custom_font?: string;
  watermark_text?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTemplatePreferenceInput {
  template_id: string;
  custom_colors?: {
    background: string;
    text: string;
    accent: string;
  };
  custom_font?: string;
  watermark_text?: string;
}

// ---------------------------------------------------------------------------
// Dimension constants
// ---------------------------------------------------------------------------

export const CARD_DIMENSIONS: Record<CardFormat, { width: number; height: number }> = {
  instagram_story: { width: 1080, height: 1920 },
  instagram_post: { width: 1080, height: 1080 },
  whatsapp: { width: 800, height: 800 },
};

export const WHATSAPP_MAX_IMAGE_BYTES = 500 * 1024; // 500KB
