// src/tts/engine.js
import * as ort from "onnxruntime-web";
import * as tts from "@diffusionstudio/vits-web";
import { getCachedAudio, storeCachedAudio } from "./cache.js";

// -----------------------------
// Configure ONNX Runtime Web
// -----------------------------
if (crossOriginIsolated) {
  ort.env.wasm.numThreads = navigator.hardwareConcurrency || 8;
  ort.env.wasm.simd = true;
  console.log("ONNX Runtime: multi-threaded mode enabled");
} else {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = false;
  console.log("ONNX Runtime: single-thread mode (dev)");
}

// -----------------------------
// Prefetch buffer
// -----------------------------
let nextAudioBlob = null;

// -----------------------------
// Prefetch next paragraph
// -----------------------------
async function prefetchParagraph(articleId, paragraphIndex, text) {
  const key = `${articleId}-${paragraphIndex}`;
  console.log(`🟦 [PREFETCH] Attempting prefetch for key: ${key}`);

  // 1. Try cache
  const cached = await getCachedAudio(key);
  if (cached) {
    console.log(`🟩 [PREFETCH HIT] Cached audio ready for key: ${key}`);
    nextAudioBlob = cached;
    return;
  }

  // 2. Generate
  console.log(`🟧 [PREFETCH MISS] Generating audio for key: ${key}`);
  const wav = await tts.predict({
    text,
    voiceId: "en_US-hfc_female-medium",
  });

  console.log(`🟧 [PREFETCH GENERATED] Blob size: ${wav.size}`);
  await storeCachedAudio(key, wav);

  nextAudioBlob = wav;
}

// -----------------------------
// Main TTS function with prefetching
// -----------------------------
export async function speakParagraph(articleId, paragraphIndex, text, nextText = null) {
  const key = `${articleId}-${paragraphIndex}`;
  console.log(`🔎 [TTS] Request for key: ${key}`);
  console.log(`📝 [TTS] Text:`, text);

  // 1. Load current paragraph
  let blob = await getCachedAudio(key);

  if (blob) {
    console.log(`✅ [CACHE HIT] Found audio for key: ${key}`);
  } else {
    console.log(`❌ [CACHE MISS] Generating audio for key: ${key}`);
    blob = await tts.predict({
      text,
      voiceId: "en_US-hfc_female-medium",
    });

    console.log(`🎧 [TTS] Generated WAV blob: type=${blob.type}, size=${blob.size}`);
    await storeCachedAudio(key, blob);
  }

  // 2. Prefetch next paragraph in background
  if (nextText) {
    prefetchParagraph(articleId, paragraphIndex + 1, nextText);
  }

  // 3. Play current paragraph
  const duration = await playBlob(blob);

  // 4. If nextAudioBlob is ready, return it for instant playback
  if (nextAudioBlob) {
    const ready = nextAudioBlob;
    nextAudioBlob = null;
    return { duration, preloaded: ready };
  }

  return { duration, preloaded: null };
}

// -----------------------------
// Play WAV blob
// -----------------------------
function playBlob(blob) {
  console.log(`🔊 [AUDIO] Playing blob: type=${blob.type}, size=${blob.size}`);

  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);

    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      console.log(`⏱️ [AUDIO] Duration: ${duration}s`);
      audio.play();

      audio.onended = () => {
        console.log(`🏁 [AUDIO] Finished playback`);
        resolve(duration);
      };
    };
  });
}
