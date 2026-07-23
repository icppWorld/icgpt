// The models ICGPT can serve. Single source of truth for the model dropdown
// (ModelSelector) and the inference path (llamacpp.js).
//
// Each entry:
//   id            - stable key used in app state (selectedModelId)
//   gguf          - the full gguf filename; this IS the dropdown option text
//   hfUrl         - HuggingFace repo page (the clickable link next to the dropdown)
//   hfDownloadUrl - optional direct .gguf download link
//   finetuneType  - 'Instruct' (chat template style) — metadata for future models
//   available     - false => shown as a disabled "coming soon" placeholder
//   declarations  - webpack alias of the canister's JS bindings (available models only)

export const MODELS = [
  {
    id: 'qwen25-05b-instruct-q8',
    gguf: 'qwen2.5-0.5b-instruct-q8_0.gguf',
    hfUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    finetuneType: 'Instruct',
    available: true,
    declarations: 'DeclarationsCanisterLlamacpp_Qwen25_05B_Q8',
  },
  {
    id: 'qwen3-06b-q8',
    gguf: 'Qwen3-0.6B-Q8_0.gguf',
    hfUrl: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF',
    hfDownloadUrl:
      'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
    finetuneType: 'Instruct',
    available: false, // placeholder — implemented next
  },
]

export const DEFAULT_MODEL_ID = MODELS[0].id

export function getModelById(id) {
  return MODELS.find((m) => m.id === id) || MODELS[0]
}
