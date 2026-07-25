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
//                               false (Qwen2.5) => always the plain assistant open.

export const MODELS = [
  {
    id: 'qwen3-06b-q8',
    gguf: 'Qwen3-0.6B-Q8_0.gguf',
    hfUrl: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF',
    hfDownloadUrl:
      'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
    finetuneType: 'Instruct',
    available: true,
    inference: {
      cacheTypeK: 'q8_0',
      cacheTypeV: 'q8_0',
      supportsThinking: true,
    },
  },
  {
    id: 'qwen25-05b-instruct-q8',
    gguf: 'qwen2.5-0.5b-instruct-q8_0.gguf',
    hfUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    finetuneType: 'Instruct',
    available: true,
    inference: {
      cacheTypeK: 'q8_0',
      cacheTypeV: 'q8_0',
      supportsThinking: false,
    },
  },
]

export const DEFAULT_MODEL_ID = MODELS[0].id

export function getModelById(id) {
  return MODELS.find((m) => m.id === id) || MODELS[0]
}
