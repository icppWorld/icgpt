// The models ICGPT can serve. Single source of truth for the model dropdown
// (ModelSelector) and the inference path (llamacpp.js).
//
// Each entry:
//   id            - stable key used in app state (selectedModelId)
//   gguf          - the full gguf filename; this IS the dropdown option text AND the
//                   key the icgpt_admin controller routes new_chat by (add_llm_canister)
//   hfUrl         - HuggingFace repo page (the clickable link next to the dropdown)
//   hfDownloadUrl - optional direct .gguf download link
//   finetuneType  - 'Instruct' (chat template style) — metadata for future models
//   available     - false => shown as a disabled "coming soon" placeholder
//   inference     - per-model config used to build new_chat/run_update args and the
//                   prompt template. Sampling knobs (temp, top_p, penalties, …) are NOT
//                   here — they are user-tunable in the Parameters panel (see params.js).
//     cacheTypeK / cacheTypeV - KV-cache quantization; MUST match how the canister
//                               loaded the model (both q8_0 for the 16K-context config)
//     supportsThinking        - true => hybrid thinking model (Qwen3): the Parameters
//                               panel's Thinking toggle chooses the assistant-turn opener.
//                               false (Qwen2.5, Gemma) => always the plain open.
//     promptFormat            - chat template family: 'chatml' (Qwen) | 'gemma' (Gemma 3,
//                               which has NO system role). Selects the template in
//                               llamacpp.js (TEMPLATES). Defaults to 'chatml' if absent.
//   note          - optional one-line quality/use-case hint shown under the dropdown.

export const MODELS = [
  // Ordered by model size (# weights), lightest → heaviest — matches Appendix A of the
  // llama_cpp_canister README. The dropdown renders them in this order; the DEFAULT model
  // is pinned separately (below) so it does NOT follow the array order.
  {
    id: 'gemma-3-270m-it-q8',
    gguf: 'gemma-3-270m-it-Q8_0.gguf', // 270 M
    hfUrl: 'https://huggingface.co/unsloth/gemma-3-270m-it-GGUF',
    hfDownloadUrl:
      'https://huggingface.co/unsloth/gemma-3-270m-it-GGUF/resolve/main/gemma-3-270m-it-Q8_0.gguf',
    finetuneType: 'Instruct',
    available: true,
    note: 'Smallest & cheapest on-chain model — fast, great for simple tasks & demos, but unreliable at precise instructions. Prefer Qwen3 for quality.',
    inference: {
      cacheTypeK: 'q8_0', // matches the q8_0 KV cache the canister loaded with
      cacheTypeV: 'q8_0',
      supportsThinking: false, // gemma is NOT a thinking model
      promptFormat: 'gemma', // NEW template — no system role (see llamacpp.js TEMPLATES)
    },
  },
  {
    id: 'qwen3-06b-q8',
    gguf: 'Qwen3-0.6B-Q8_0.gguf', // 600 M — the default
    hfUrl: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF',
    hfDownloadUrl:
      'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
    finetuneType: 'Instruct',
    available: true,
    inference: {
      cacheTypeK: 'q8_0',
      cacheTypeV: 'q8_0',
      supportsThinking: true,
      promptFormat: 'chatml',
    },
  },
  {
    id: 'qwen25-05b-instruct-q8',
    gguf: 'qwen2.5-0.5b-instruct-q8_0.gguf', // 630 M
    hfUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    finetuneType: 'Instruct',
    available: true,
    inference: {
      cacheTypeK: 'q8_0',
      cacheTypeV: 'q8_0',
      supportsThinking: false,
      promptFormat: 'chatml',
    },
  },
  {
    id: 'lfm2-1p2b-q4',
    gguf: 'LFM2.5-1.2B-Instruct-Q4_K_M.gguf', // 1.2 B
    hfUrl: 'https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF',
    hfDownloadUrl:
      'https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF/resolve/main/LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
    finetuneType: 'Instruct',
    available: true,
    note: 'Liquid AI hybrid model — a faster, cheaper alternative to Qwen3-1.7B (about half the cycles per call and more tokens per call) at similar quality.',
    inference: {
      cacheTypeK: 'q8_0',
      cacheTypeV: 'q8_0',
      supportsThinking: false,
      // LFM2 uses ChatML. The canister applies no chat template, so the frontend sends the
      // fully-rendered prompt — exactly what the 'chatml' template already does for Qwen.
      promptFormat: 'chatml',
    },
  },
  {
    id: 'qwen3-17b-q4',
    gguf: 'Qwen3-1.7B-Q4_K_M.gguf', // 1.7 B
    hfUrl: 'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF',
    hfDownloadUrl:
      'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
    finetuneType: 'Instruct',
    available: true,
    inference: {
      cacheTypeK: 'q8_0',
      cacheTypeV: 'q8_0',
      supportsThinking: true,
      promptFormat: 'chatml',
    },
  },
]

// Default selected model — pinned to Qwen3-0.6B (a solid quality/speed balance),
// independent of the weight-sorted array order above.
export const DEFAULT_MODEL_ID = 'qwen3-06b-q8'

export function getModelById(id) {
  return MODELS.find((m) => m.id === id) || MODELS[0]
}
