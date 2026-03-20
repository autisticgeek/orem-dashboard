// src/tts/engine.js
import { getCachedAudio, storeCachedAudio } from "./cache.js";

// -----------------------------
// Prefetch buffer
// -----------------------------
let nextAudioBlob = null;

// -----------------------------
// Fetch WAV from Piper server
// -----------------------------
async function fetchFromPiper(text) {
  const response = await fetch("https://tts.pinyon.dev/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Piper server error: ${response.status}`);
  }

  return await response.blob();
}

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

  // 2. Generate via Piper
  console.log(`🟧 [PREFETCH MISS] Generating audio for key: ${key}`);
  const wav = await fetchFromPiper(text);

  console.log(`🟧 [PREFETCH GENERATED] Blob size: ${wav.size}`);
  await storeCachedAudio(key, wav);

  nextAudioBlob = wav;
}

// -----------------------------
// Main TTS function with prefetching
// -----------------------------
export async function speakParagraph(
  articleId,
  paragraphIndex,
  text,
  nextText = null
) {
  const key = `${articleId}-${paragraphIndex}`;
  console.log(`🔎 [TTS] Request for key: ${key}`);
  console.log(`📝 [TTS] Text:`, text);

  // 1. Load current paragraph
  let blob = await getCachedAudio(key);

  if (blob) {
    console.log(`✅ [CACHE HIT] Found audio for key: ${key}`);
  } else {
    console.log(`❌ [CACHE MISS] Generating audio for key: ${key}`);
    blob = await fetchFromPiper(text);

    console.log(
      `🎧 [TTS] Generated WAV blob: type=${blob.type}, size=${blob.size}`
    );
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
async function playBlob(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  const buffer = await audioCtx.decodeAudioData(arrayBuffer);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);

  const duration = buffer.duration;
  const tStart = audioCtx.currentTime;

  source.start();

  return new Promise((resolve) => {
    source.onended = () => {
      const actual = audioCtx.currentTime - tStart;
      resolve({ duration, actual, drift: duration - actual });
    };
  });
}
