'use strict';

const { getAdapter } = require('./ai/providers/registry');
const { supportsVision: adapterSupportsVision } = require('./ai/providers/capabilities');
const { 
  buildSummaryPrompts, 
  addImageGuidance, 
  buildCombinePrompt,
  getToneInstructions,
  getStyleInstructions 
} = require('./ai/prompts');
const { 
  estimateTokens, 
  splitTextIntoChunksByTokens, 
  calculateWordTargets,
  getTokenSettings 
} = require('./ai/chunking');
const { createLogger } = require('./logger');

const logger = createLogger('aiSummarizer');

/**
 * Summarize text (and optionally images) using AI
 * @param {string} text - Text to summarize
 * @param {string} summaryType - Type of summary ('normal', 'short', or 'longer')
 * @param {Object|string} arg3 - Options object or API key (legacy)
 * @param {string} [responseTone] - Tone of response (legacy param)
 * @param {string} [model] - Model to use (legacy param)
 * @param {string} [summaryStyle] - Style of summary (legacy param)
 * @param {Function} [onProgress] - Progress callback (legacy param)
 * @param {Array} [images] - Images for vision models (legacy param)
 * @returns {Promise<string>} Summary text
 */
async function summarizeText(text, summaryType, arg3, responseTone = 'casual', model = 'openai/gpt-4o-mini', summaryStyle = 'teaching', onProgress = null, images = []) {
  // Normalize arguments to an options object
  let opts;
  if (typeof arg3 === 'object' && arg3 !== null && (arg3.apiKey || arg3.provider || arg3.model || arg3.responseTone || arg3.summaryStyle)) {
    opts = arg3;
  } else {
    // Legacy positional signature
    opts = { apiKey: arg3, responseTone, model, summaryStyle, onProgress, images };
  }

  const provider = opts.provider || 'openrouter';
  const apiKey = opts.apiKey || '';
  model = opts.model || model;
  responseTone = opts.responseTone || responseTone;
  summaryStyle = opts.summaryStyle || summaryStyle;
  onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : onProgress;
  images = Array.isArray(opts.images) ? opts.images : images;

  // Resolve adapter client
  const adapter = getAdapter(provider);
  if (!adapter) {
    throw new Error(`AI summarization failed: Unsupported provider '${provider}'`);
  }

  const client = adapter.createClient({ 
    apiKey, 
    baseURL: opts.baseURL, 
    endpoint: opts.endpoint, 
    deployment: opts.deployment, 
    apiVersion: opts.apiVersion 
  });

  // Calculate word targets
  const { minWordsTarget, maxWordsTarget } = calculateWordTargets(text, summaryType);

  // Get MCQ count
  const mcqCount = Number.isFinite(Number(opts.mcqCount)) 
    ? Math.max(1, Math.min(50, Math.trunc(Number(opts.mcqCount)))) 
    : 5;

  // Build prompts using the prompts module
  let { systemPrompt, userPrompt } = buildSummaryPrompts({
    summaryType,
    summaryStyle,
    responseTone,
    text,
    mcqCount,
    minWordsTarget,
    maxWordsTarget
  });

  // Add image guidance if images are provided
  const hasImages = Array.isArray(images) && images.length > 0;
  if (hasImages) {
    const modified = addImageGuidance(systemPrompt, userPrompt);
    systemPrompt = modified.systemPrompt;
    userPrompt = modified.userPrompt;
  }

  try {
    // Get token settings for this summary type
    const { targetChunkTokens, maxTokens, chunkMaxTokens } = getTokenSettings(summaryType);
    
    // Split text into chunks
    const chunks = splitTextIntoChunksByTokens(text, targetChunkTokens);

    if (chunks.length === 1) {
      return await processSingleChunk({
        adapter, client, model, systemPrompt, userPrompt, 
        maxTokens, images, onProgress
      });
    } else {
      return await processMultipleChunks({
        adapter, client, model, systemPrompt, userPrompt, 
        chunks, chunkMaxTokens, maxTokens, 
        summaryStyle, responseTone, mcqCount, onProgress
      });
    }
  } catch (error) {
    const msg = error && error.message ? error.message : String(error);
    if (/^RATE_LIMIT:/.test(msg) || /^QUOTA_EXCEEDED:/.test(msg) || /^INVALID_API_KEY:/.test(msg)) {
      throw new Error(msg);
    }
    logger.error('Summarization failed', error);
    throw new Error(`AI summarization failed: ${msg}`);
  }
}

/**
 * Process a single chunk of text
 * @private
 */
async function processSingleChunk({ adapter, client, model, systemPrompt, userPrompt, maxTokens, images, onProgress }) {
  const userMessage = buildUserMessage(userPrompt, images);
  let full = '';

  try {
    const out = await adapter.chat({
      client,
      model,
      messages: [{ role: 'system', content: systemPrompt }, userMessage],
      temperature: 0.3,
      maxTokens,
      stream: true,
      onDelta: (delta) => {
        full += delta;
        if (typeof onProgress === 'function') {
          onProgress({ type: 'delta', deltaText: delta, totalChars: full.length });
        }
      }
    });
    if (typeof onProgress === 'function') {
      onProgress({ type: 'done', totalChars: out.length });
    }
    return out;
  } catch (streamError) {
    // Fallback to non-streaming
    logger.warn('Streaming failed, falling back to non-streaming', streamError);
    const out = await adapter.chat({
      client,
      model,
      messages: [{ role: 'system', content: systemPrompt }, userMessage],
      temperature: 0.3,
      maxTokens,
      stream: false
    });
    if (typeof onProgress === 'function') {
      onProgress({ type: 'done', totalChars: out.length });
    }
    return out;
  }
}

/**
 * Process multiple chunks and combine them
 * @private
 */
async function processMultipleChunks({ 
  adapter, client, model, systemPrompt, userPrompt, 
  chunks, chunkMaxTokens, maxTokens, 
  summaryStyle, responseTone, mcqCount, onProgress 
}) {
  const chunkSummaries = [];

  for (let i = 0; i < chunks.length; i++) {
    if (typeof onProgress === 'function') {
      onProgress({ type: 'chunk-start', chunkIndex: i + 1, totalChunks: chunks.length });
    }

    // For chunk-level prompts, avoid asking for MCQs in each chunk
    const chunkHeader = (summaryStyle === 'mcqs')
      ? 'Please create a concise summary of this part only. DO NOT generate any multiple-choice questions for individual parts — the MCQs should be generated only once after all parts are combined.'
      : userPrompt.split('Content:')[0];

    const chunkPrompt = `${chunkHeader}
This is part ${i + 1} of ${chunks.length}.

Content:
${chunks[i]}`;

    let chunkFull = '';
    try {
      const out = await adapter.chat({
        client,
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: chunkPrompt }],
        temperature: 0.3,
        maxTokens: chunkMaxTokens,
        stream: true,
        onDelta: (delta) => {
          chunkFull += delta;
          if (typeof onProgress === 'function') {
            onProgress({ 
              type: 'delta', 
              deltaText: delta, 
              totalChars: chunkFull.length, 
              chunkIndex: i + 1, 
              totalChunks: chunks.length 
            });
          }
        }
      });
      chunkFull = out;
    } catch (streamError) {
      logger.warn(`Chunk ${i + 1} streaming failed, using non-streaming`, streamError);
      const out = await adapter.chat({
        client,
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: chunkPrompt }],
        temperature: 0.3,
        maxTokens: chunkMaxTokens,
        stream: false
      });
      chunkFull = out;
    }

    if (typeof onProgress === 'function') {
      onProgress({ type: 'chunk-done', chunkIndex: i + 1, totalChunks: chunks.length });
    }
    chunkSummaries.push(chunkFull.trim());
  }

  // Combine chunks if more than one
  if (chunkSummaries.length > 1) {
    if (typeof onProgress === 'function') {
      onProgress({ type: 'combine-start' });
    }

    const selectedTone = getToneInstructions(responseTone);
    const selectedStyle = getStyleInstructions(summaryStyle)[summaryStyle] || getStyleInstructions(summaryStyle).teaching;

    const combinePrompt = buildCombinePrompt({
      summaryStyle, 
      selectedTone, 
      selectedStyle, 
      chunkSummaries, 
      mcqCount
    });

    let final = '';
    try {
      const out = await adapter.chat({
        client,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: combinePrompt }
        ],
        temperature: 0.3,
        maxTokens,
        stream: true,
        onDelta: (delta) => {
          final += delta;
          if (typeof onProgress === 'function') {
            onProgress({ type: 'delta', deltaText: delta, totalChars: final.length });
          }
        }
      });
      final = out;
    } catch (streamError) {
      logger.warn('Combine streaming failed, using non-streaming', streamError);
      const out = await adapter.chat({
        client,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: combinePrompt }
        ],
        temperature: 0.3,
        maxTokens,
        stream: false
      });
      final = out;
    }

    if (typeof onProgress === 'function') {
      onProgress({ type: 'done', totalChars: final.length });
    }
    return final.trim();
  }

  const only = chunkSummaries[0];
  if (typeof onProgress === 'function') {
    onProgress({ type: 'done', totalChars: only.length });
  }
  return only;
}

/**
 * Build a user message supporting optional image content for vision models
 * @param {string} userPrompt - The user prompt text
 * @param {Array} images - Optional images
 * @returns {Object} Message object
 */
function buildUserMessage(userPrompt, images) {
  if (!images || images.length === 0) {
    return { role: 'user', content: userPrompt };
  }
  
  // Build multi-part content with text and images
  const parts = [
    { 
      type: 'text', 
      text: `${userPrompt}\n\nConsider the following images as OPTIONAL supporting context.\nDo not transcribe them; extract only brief, high-signal labels/captions if they aid the summary:` 
    }
  ];
  
  for (const img of images) {
    parts.push({ 
      type: 'text', 
      text: img.altText ? `Slide ${img.slideNumber}: ${img.altText}` : `Slide ${img.slideNumber}` 
    });
    parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
  }
  
  return { role: 'user', content: parts };
}

/**
 * Check if a model supports vision
 * @param {string} model - Model identifier
 * @param {string} provider - Provider name
 * @returns {boolean}
 */
function modelSupportsVision(model, provider) {
  return adapterSupportsVision(model, provider);
}

/**
 * Answer a user question using ONLY the provided summary as context
 * @param {string} summary - The previously generated summary text
 * @param {string} question - The user's question
 * @param {string|Object} apiKeyOrOptions - API key or options object
 * @param {string} [model] - Model to use (legacy param)
 * @param {Function} [onProgress] - Progress callback (legacy param)
 * @returns {Promise<string>} The model's answer
 */
async function answerQuestionAboutSummary(summary, question, apiKeyOrOptions, model = 'openai/gpt-4o-mini', onProgress = null) {
  let provider = 'openrouter';
  let apiKey = apiKeyOrOptions;
  let opts = {};

  if (typeof apiKeyOrOptions === 'object' && apiKeyOrOptions !== null) {
    opts = apiKeyOrOptions;
    apiKey = opts.apiKey || '';
    provider = opts.provider || 'openrouter';
    model = opts.model || model;
    onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : onProgress;
  }

  const adapter = getAdapter(provider);
  if (!adapter) {
    throw new Error(`AI Q&A failed: Unsupported provider '${provider}'`);
  }

  const client = adapter.createClient({ 
    apiKey, 
    baseURL: opts.baseURL, 
    endpoint: opts.endpoint, 
    deployment: opts.deployment, 
    apiVersion: opts.apiVersion 
  });

  const systemPrompt = `You are a helpful study assistant.
You will be given a SUMMARY of a document and a USER QUESTION.
Answer strictly using the information present in the SUMMARY.
Do NOT invent information that is not stated or clearly implied by the summary.
If the summary does not contain enough information to answer, reply: "I don't have enough information from the summary to answer that."`;

  const userPrompt = `SUMMARY:

${summary}

QUESTION: ${question}

INSTRUCTIONS:
- Base your answer ONLY on the SUMMARY above.
- Be concise but clear. If the answer requires steps, use a short list.
- If uncertain or missing info, explicitly say you do not have enough information.`;

  try {
    let full = '';
    try {
      const out = await adapter.chat({
        client,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        maxTokens: 800,
        stream: true,
        onDelta: (delta) => {
          full += delta;
          if (typeof onProgress === 'function') {
            onProgress({ type: 'delta', deltaText: delta, totalChars: full.length });
          }
        }
      });
      if (typeof onProgress === 'function') {
        onProgress({ type: 'done', totalChars: out.length });
      }
      return out.trim();
    } catch (streamError) {
      logger.warn('Q&A streaming failed, using non-streaming', streamError);
      const out = await adapter.chat({
        client,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        maxTokens: 800,
        stream: false
      });
      return out.trim();
    }
  } catch (error) {
    const msg = error && error.message ? error.message : String(error);
    if (/^RATE_LIMIT:/.test(msg) || /^QUOTA_EXCEEDED:/.test(msg) || /^INVALID_API_KEY:/.test(msg)) {
      throw new Error(msg);
    }
    logger.error('Q&A failed', error);
    throw new Error(`AI Q&A failed: ${msg}`);
  }
}

module.exports = {
  summarizeText,
  estimateTokens,
  splitTextIntoChunksByTokens,
  modelSupportsVision,
  answerQuestionAboutSummary
};
