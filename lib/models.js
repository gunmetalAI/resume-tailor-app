// Available models configuration
// This file is safe to import in both client and server components
export const AVAILABLE_MODELS = {
  claude: [
    // Claude 4.5 family (latest)
    // { id: "claude-opus-4-5-20251124", name: "Claude Opus 4.5" },
    // { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },

    // Claude 4 family
    // { id: "claude-opus-4-1-20250805", name: "Claude Opus 4.1" },
    // { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
    // { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },

    // // Claude 3.7 and 3.5 family
    // { id: "claude-3-7-sonnet-20250219", name: "Claude Sonnet 3.7" },
    // { id: "claude-3-5-sonnet-20241022", name: "Claude Sonnet 3.5" },
    // { id: "claude-3-5-haiku-20241022", name: "Claude Haiku 3.5" },

    // // Claude 3 family (legacy)
    // { id: "claude-3-opus-20240229", name: "Claude Opus 3" },
    // { id: "claude-3-sonnet-20240229", name: "Claude Sonnet 3" },
    // { id: "claude-3-haiku-20240307", name: "Claude Haiku 3" }
  ],
  openai: [
    // GPT-5.2 family (latest)
    { id: "gpt-5.2-chat-latest", name: "GPT-5.2 Instant (chat-latest)" },
    { id: "gpt-5.2", name: "GPT-5.2 (Thinking)" },
    { id: "gpt-5.2-pro", name: "GPT-5.2 Pro" },

    // GPT-5 family
    { id: "gpt-5", name: "GPT-5" },
    { id: "gpt-5-mini", name: "GPT-5 Mini" },
    { id: "gpt-5-nano", name: "GPT-5 Nano" },

    // GPT-5.1
    { id: "gpt-5.1", name: "GPT-5.1" },

    // GPT-4.1 family
    { id: "gpt-4.1", name: "GPT-4.1" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
    { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },

    // GPT-4o family
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },

    // GPT-4 family
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "gpt-4-turbo-preview", name: "GPT-4 Turbo (Preview)" },
    { id: "gpt-4", name: "GPT-4" },

    // GPT-3.5 family
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" }
  ]
};

// Get default model for a provider
export function getDefaultModel(provider) {
  const models = AVAILABLE_MODELS[provider];
  return models && models.length > 0 ? models[0].id : null;
}
