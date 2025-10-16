const OpenAI = require('openai');

/**
 * Summarize text (and optionally images) using OpenRouter API
 * @param {string} text - Text to summarize
 * @param {string} summaryType - Type of summary ('normal' or 'short' or 'longer')
 * @param {string} apiKey - OpenRouter API key
 * @param {string} responseTone - Tone of response ('casual', 'formal', 'informative', 'easy')
 * @param {string} model - Model to use (defaults to gpt-4o-mini via OpenRouter)
 * @param {string} summaryStyle - Style of summary ('teaching' or 'notes')
 * @param {function|null} onProgress - optional callback for streaming progress
 * @param {Array<{dataUrl:string, altText?:string}>} [images] - Optional images for vision-capable models
 * @returns {Promise<string>} - Summary text
 */
// onProgress: optional callback({ type: 'delta'|'chunk-start'|'chunk-done'|'combine-start'|'done', deltaText?, totalChars? , chunkIndex?, totalChunks? })
async function summarizeText(text, summaryType, apiKey, responseTone = 'casual', model = 'openai/gpt-4o-mini', summaryStyle = 'teaching', onProgress = null, images = []) {
  // Configure OpenAI SDK to use OpenRouter
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/yourusername/squailor', // Optional: Replace with your app URL
      'X-Title': 'Squailor Document Summarizer', // Optional: App name
    }
  });

  // Tone-specific adjustments
  const toneInstructions = {
    casual: {
      style: 'friendly and conversational',
      instructions: 'Use a relaxed, approachable tone. Write as if explaining to a friend. Use contractions and everyday language.'
    },
    formal: {
      style: 'professional and academic',
      instructions: 'Use formal academic language. Maintain a professional tone with precise terminology. Avoid contractions and casual expressions.'
    },
    informative: {
      style: 'fact-focused and comprehensive',
      instructions: 'Focus on delivering factual information clearly. Use an encyclopedic style. Include relevant details and context.'
    },
    easy: {
      style: 'simplified and accessible',
      instructions: 'Use simple, everyday words. Break down complex ideas into easy-to-understand concepts. Explain technical terms in plain language.'
    }
  };

  const selectedTone = toneInstructions[responseTone] || toneInstructions.casual;

  // Style-specific adjustments - adapt based on length
  const styleInstructions = {
    teaching: {
      format: 'teaching explanation',
      instructions: summaryType === 'longer' 
        ? 'Write as a comprehensive educational explanation. Use detailed paragraphs with complete sentences. Structure the content as if writing a textbook chapter - thorough, explanatory, and educational.'
        : 'Write as a clear, organized explanation. Use headings, paragraphs, and complete sentences. Structure the content to teach and explain the material thoroughly.'
    },
    notes: {
      format: 'student notes',
      instructions: summaryType === 'longer'
        ? 'Write as if a dedicated student is taking comprehensive notes during an important lecture. Use bullet points but EXPAND each point with full explanations and details. Write complete thoughts and elaborate explanations, not just short phrases. Use arrows (→), dashes (-), and indentation for hierarchy, but include thorough details at each level.'
        : 'Write as if a student is taking notes during class. Use bullet points, short phrases, abbreviations where natural, key terms highlighted, and organized sections. Be concise but capture all important information. Use arrows (→), dashes (-), and indentation for hierarchy.'
    }
  };

  const selectedStyle = styleInstructions[summaryStyle] || styleInstructions.teaching;

  // Estimate length targets to reduce over-compression, especially in 'longer' mode
  const approxWords = Math.max(1, Math.floor(text.length / 5));
  let minWordsTarget = 0;
  let maxWordsTarget = 0;
  if (summaryType === 'short') {
    // Aggressive compression
    minWordsTarget = Math.min(600, Math.floor(approxWords * 0.08));
    maxWordsTarget = Math.max(minWordsTarget + 150, Math.floor(approxWords * 0.15));
  } else if (summaryType === 'normal') {
    // Moderate compression
    minWordsTarget = Math.min(3000, Math.floor(approxWords * 0.25));
    maxWordsTarget = Math.max(minWordsTarget + 400, Math.floor(approxWords * 0.45));
  } else {
    // 'longer' — minimal compression; allow near-original length when needed
    minWordsTarget = Math.min(12000, Math.floor(approxWords * 0.55));
    maxWordsTarget = Math.min(18000, Math.max(minWordsTarget + 1000, Math.floor(approxWords * 0.9)));
  }

  // Prepare prompt based on summary type and style
  let systemPrompt = '';
  let userPrompt = '';

  if (summaryType === 'short') {
    if (summaryStyle === 'notes') {
      systemPrompt = `You are an expert at creating concise student notes with a ${selectedTone.style} tone. 
Your task is to write notes as if a student is jotting down key information during a lecture.
${selectedTone.instructions}
${selectedStyle.instructions}
Focus on the most important information only.`;

      userPrompt = `Please create SHORT NOTES from the following content.
Write as if you're a student taking notes - use bullet points, abbreviations, arrows (→), and short phrases.
Extract only the most critical information and key takeaways.
Use a ${selectedTone.style} writing style in ${selectedStyle.format} format.

Example format:
• Main Topic
  - Key point 1 → explanation
  - Key point 2 (important!)
  - Sub-topic:
    • Detail A
    • Detail B

Content:
${text}`;
    } else {
      // Teaching mode
      systemPrompt = `You are an expert at creating concise, bullet-point summaries with a ${selectedTone.style} tone. 
Your task is to extract the key points from documents and present them as clear, actionable bullet points. 
${selectedTone.instructions}
${selectedStyle.instructions}
Focus on the most important information only.`;

      userPrompt = `Please create a SHORT summary of the following content in bullet point format.
Extract only the most critical information and key takeaways.
Format your response with clear bullet points using • or - symbols.
Maintain a ${selectedTone.style} writing style in ${selectedStyle.format} format.

Content:
${text}`;
    }
  } else if (summaryType === 'longer') {
    if (summaryStyle === 'notes') {
      systemPrompt = `You are an expert at creating comprehensive, in-depth student notes with a ${selectedTone.style} approach. 
Your task is to write extensive notes as if a dedicated student is capturing every important detail during a lecture.
${selectedTone.instructions}
${selectedStyle.instructions}
Your notes should be THOROUGH and COMPREHENSIVE. Do not just list bullet points - expand on each concept with full explanations, examples, and context.
Minimize compression and preserve as much detail as practical.`;

      userPrompt = `Please create COMPREHENSIVE, IN-DEPTH NOTES from the following content.
Write as if you're a diligent student taking detailed notes during an important lecture where you want to capture EVERYTHING.

IMPORTANT INSTRUCTIONS:
- Be THOROUGH - don't just list points, expand on them with full explanations
- Include ALL important details, concepts, definitions, examples, and context
- Write complete thoughts and explanations, not just short phrases
- Aim for comprehensive coverage - your notes should allow someone to learn the topic deeply
- Use nested bullet points with DETAILED explanations at each level
- Don't skip over ideas - elaborate and explain fully
- LENGTH TARGET: At minimum, write ${minWordsTarget.toLocaleString()} words and up to about ${maxWordsTarget.toLocaleString()} words if needed to preserve detail.

Format with clear hierarchy but EXPAND each point:
# Main Topic 1
• Core concept: [Full explanation of the concept, not just a label]
  - Supporting detail: [Detailed explanation with context and reasoning]
    • Sub-detail: [Comprehensive explanation with examples]
    • Additional context: [More thorough explanation]
  - Another detail: [Full elaboration with implications]
    • Example: [Detailed example with explanation of why it matters]
    • Important note: [Complete explanation of significance]
  
## Sub-Topic 1.1
• First major point: [Thorough explanation covering all aspects]
  - Detail A: [Complete description with reasoning]
  - Detail B: [Full explanation with connections to other concepts]

Use a ${selectedTone.style} writing style in ${selectedStyle.format} format.

Content:
${text}`;
    } else {
      // Teaching mode - VERY detailed paragraphs
      systemPrompt = `You are an expert educational writer with a ${selectedTone.style} approach. 
Your task is to create EXTENSIVE, COMPREHENSIVE explanations that thoroughly teach the content.
${selectedTone.instructions}
${selectedStyle.instructions}
Write in detailed paragraphs with complete explanations. Do NOT just list bullet points or short summaries.
Think of this as writing a textbook chapter or detailed study guide. Be thorough and comprehensive.
Minimize compression. Retain as much detail as practical while organizing and clarifying the material.`;

      userPrompt = `Please create an EXTENSIVE, IN-DEPTH EXPLANATION of the following content.

IMPORTANT INSTRUCTIONS:
- Write in FULL PARAGRAPHS with thorough explanations, not bullet points
- Explain concepts completely - as if writing a detailed textbook chapter
- Include ALL important information: concepts, definitions, examples, context, implications
- Be comprehensive - don't skip over ideas, elaborate on everything important
- Use clear headings and sections, but write detailed explanatory paragraphs under each
- Aim for depth and thoroughness - someone should be able to learn this topic deeply from your explanation
- LENGTH TARGET: At minimum, write ${minWordsTarget.toLocaleString()} words and up to about ${maxWordsTarget.toLocaleString()} words if needed to preserve detail. Do NOT aggressively shorten the content.

Structure your response with:
- Clear headings and subheadings for organization
- Detailed paragraphs (4-6 sentences each) explaining concepts thoroughly
- Complete explanations with reasoning, examples, and context
- Comprehensive coverage of all major topics and supporting details

Use a ${selectedTone.style} writing style in ${selectedStyle.format} format.
Write as if you're creating a detailed study guide or textbook section.

Content:
${text}`;
    }
  } else {
    // Normal mode
    if (summaryStyle === 'notes') {
      systemPrompt = `You are an expert at creating detailed student notes with a ${selectedTone.style} approach. 
Your task is to write comprehensive notes as if a diligent student is capturing the content during a lecture.
${selectedTone.instructions}
${selectedStyle.instructions}
Your notes should be clear, well-organized, and maintain important details while using note-taking conventions.`;

      userPrompt = `Please create DETAILED NOTES from the following content.
Write as if you're a student taking comprehensive notes during class.
Use bullet points, numbered lists, arrows (→), abbreviations, and indentation for hierarchy.
Organize information logically with clear sections and sub-sections.
Maintain important details, examples, and explanations.
Use a ${selectedTone.style} writing style in ${selectedStyle.format} format.

Example format:
# Main Topic 1
• Key concept → definition/explanation
  - Supporting detail
  - Example: [example text]
• Another key point
  - Sub-detail A
  - Sub-detail B → leads to...

# Main Topic 2
1. First major point
   • Detail
   • Detail → important connection
2. Second major point
   ...

Content:
${text}`;
    } else {
      // Teaching mode
      systemPrompt = `You are an expert educational assistant with a ${selectedTone.style} approach. 
Your task is to create comprehensive summaries that help students learn and understand content better.
${selectedTone.instructions}
${selectedStyle.instructions}
Your summaries should be clear, well-organized, and maintain important details while being more concise than the original.`;

  userPrompt = `Please create a DETAILED summary of the following content.
Organize the information logically with clear sections and headings where appropriate.
Maintain important details, examples, and explanations that help with learning.
Use a ${selectedTone.style} writing style in ${selectedStyle.format} format.
Make the content easier to study and understand.
${summaryType === 'longer' ? `\nLENGTH TARGET: At minimum, write ${minWordsTarget.toLocaleString()} words and up to about ${maxWordsTarget.toLocaleString()} words if needed. Avoid aggressive compression; preserve nuance and detail.` : ''}

Content:
${text}`;
    }
  }

  // If images are provided, give guidance to use them as optional context (no forced OCR transcript)
  const hasImages = Array.isArray(images) && images.length > 0;
  if (hasImages) {
    systemPrompt += `\n\nImage usage guidance:\n- PRIORITIZE the provided document text for summarization.\n- Treat images as supplementary context only.\n- Do NOT output a separate OCR transcript or verbatim dump of image text.\n- If images contain key labels, headings, or brief captions that materially improve understanding, integrate those succinctly into the summary/notes.\n- Do not over-index on images; they should aid, not dominate, the output.`;

    userPrompt = `Use the attached images only to clarify or enrich the output when they add value.\nDo not transcribe images verbatim or create a separate transcription section.\nFocus on summarizing the provided document text; incorporate only essential details from images when relevant.\n\n` + userPrompt;
  }

  try {
  // Split text into chunks if it's too long (GPT has token limits)
  const maxChunkSize = summaryType === 'longer' ? 24000 : 12000; // Larger chunks for longer mode
    const chunks = splitTextIntoChunks(text, maxChunkSize);

    if (chunks.length === 1) {
      // Single chunk - process normally
      // Adjust max tokens based on summary type
      let maxTokens = 3000; // Normal
      if (summaryType === 'short') {
        maxTokens = 1000;
      } else if (summaryType === 'longer') {
        maxTokens = 9000; // Higher for longer, comprehensive summaries
      }
      
      // Try streaming for live feedback; fallback to non-streaming if not supported
      let full = '';
      try {
        // If images are provided, prefer a vision-capable model prompt format (multi-part content)
        const userMessage = buildUserMessage(userPrompt, images);
        const stream = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            userMessage
          ],
          temperature: 0.3,
          max_tokens: maxTokens,
          stream: true
        });

        for await (const part of stream) {
          const delta = part?.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            if (typeof onProgress === 'function') {
              onProgress({ type: 'delta', deltaText: delta, totalChars: full.length });
            }
          }
        }
        if (typeof onProgress === 'function') onProgress({ type: 'done', totalChars: full.length });
        return full.trim();
      } catch (e) {
        // Fallback to non-streaming
        const userMessage = buildUserMessage(userPrompt, images);
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            userMessage
          ],
          temperature: 0.3,
          max_tokens: maxTokens
        });
        full = response.choices[0].message.content.trim();
        if (typeof onProgress === 'function') onProgress({ type: 'done', totalChars: full.length });
        return full;
      }
    } else {
      // Multiple chunks - summarize each and then combine
      const chunkSummaries = [];
      
      // Adjust chunk token limits
      let chunkMaxTokens = 1500; // Normal
      if (summaryType === 'short') {
        chunkMaxTokens = 500;
      } else if (summaryType === 'longer') {
        chunkMaxTokens = 5000; // Higher for comprehensive chunks
      }

      for (let i = 0; i < chunks.length; i++) {
        if (typeof onProgress === 'function') onProgress({ type: 'chunk-start', chunkIndex: i + 1, totalChunks: chunks.length });
        const chunkPrompt = `${userPrompt.split('Content:')[0]}
This is part ${i + 1} of ${chunks.length}.

Content:
${chunks[i]}`;

        // Attempt streaming for each chunk too (shorter feedback bursts)
        let chunkFull = '';
        try {
          const stream = await openai.chat.completions.create({
              model: model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: chunkPrompt }
              ],
              temperature: 0.3,
              max_tokens: chunkMaxTokens,
              stream: true
            });
          for await (const part of stream) {
            const delta = part?.choices?.[0]?.delta?.content || '';
            if (delta) {
              chunkFull += delta;
              if (typeof onProgress === 'function') onProgress({ type: 'delta', deltaText: delta, totalChars: chunkFull.length, chunkIndex: i + 1, totalChunks: chunks.length });
            }
          }
        } catch (e) {
          const response = await openai.chat.completions.create({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: chunkPrompt }
            ],
            temperature: 0.3,
            max_tokens: chunkMaxTokens
          });
          chunkFull = response.choices[0].message.content.trim();
        }

        if (typeof onProgress === 'function') onProgress({ type: 'chunk-done', chunkIndex: i + 1, totalChunks: chunks.length });
        chunkSummaries.push(chunkFull.trim());
      }

      // Combine summaries if multiple chunks
      if (chunkSummaries.length > 1) {
        const combinedPrompt = `Please merge these per-part outputs into a single, coherent document.
${summaryType === 'longer' 
  ? 'CRITICAL: Do NOT shorten or aggressively condense. Preserve details and explanations. Stitch the parts together with consistent structure and headings. Deduplicate only trivial exact repeats.'
  : 'Remove obvious redundancy while keeping all key information and flow.'}

Keep the style consistent with the earlier instructions.${summaryType === 'longer' ? ` Aim for at least ${minWordsTarget.toLocaleString()} words overall if the content warrants it.` : ''}

${chunkSummaries.map((s, i) => `Part ${i + 1}:\n${s}`).join('\n\n')}`;

        // Adjust final combination token limits
        let finalMaxTokens = 3000; // Normal
        if (summaryType === 'short') {
          finalMaxTokens = 1000;
        } else if (summaryType === 'longer') {
          finalMaxTokens = 9000; // Higher for comprehensive final output
        }

        if (typeof onProgress === 'function') onProgress({ type: 'combine-start' });
        let final = '';
        try {
          // Prefer streaming during the final merge so the UI shows progress
          const stream = await openai.chat.completions.create({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: combinedPrompt }
            ],
            temperature: 0.3,
            max_tokens: finalMaxTokens,
            stream: true
          });

          for await (const part of stream) {
            const delta = part?.choices?.[0]?.delta?.content || '';
            if (delta) {
              final += delta;
              if (typeof onProgress === 'function') onProgress({ type: 'delta', deltaText: delta, totalChars: final.length });
            }
          }
        } catch (e) {
          // Fallback to non-streaming if provider/model doesn't support streaming
          const finalResponse = await openai.chat.completions.create({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: combinedPrompt }
            ],
            temperature: 0.3,
            max_tokens: finalMaxTokens
          });
          final = (finalResponse.choices?.[0]?.message?.content || '').trim();
        }
        if (typeof onProgress === 'function') onProgress({ type: 'done', totalChars: final.length });
        return final.trim();
      }

      const only = chunkSummaries[0];
      if (typeof onProgress === 'function') onProgress({ type: 'done', totalChars: only.length });
      return only;
    }
  } catch (error) {
    // Check if it's a rate limit error
    if (error.message && error.message.includes('Rate limit')) {
      // Extract wait time from error message
      const waitTimeMatch = error.message.match(/Please try again in ([^.]+)/);
      const waitTime = waitTimeMatch ? waitTimeMatch[1] : 'some time';
      
      throw new Error(`RATE_LIMIT: You've hit your OpenAI API rate limit. Please wait ${waitTime} before trying again. You can check your usage at https://platform.openai.com/account/usage`);
    }
    
    // Check for other common OpenAI errors
    if (error.message && error.message.includes('insufficient_quota')) {
      throw new Error('QUOTA_EXCEEDED: Your OpenAI account has insufficient credits. Please add credits at https://platform.openai.com/account/billing');
    }
    
    if (error.message && error.message.includes('invalid_api_key')) {
      throw new Error('INVALID_API_KEY: Your API key is invalid or has been revoked. Please check your API key in Settings.');
    }
    
    // Generic error
    throw new Error(`AI summarization failed: ${error.message}`);
  }
}

/**
 * Split text into chunks of specified size
 * @param {string} text - Text to split
 * @param {number} maxSize - Maximum size of each chunk
 * @returns {Array<string>} - Array of text chunks
 */
function splitTextIntoChunks(text, maxSize) {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 <= maxSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // If a single paragraph is too long, split it by sentences
      if (paragraph.length > maxSize) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length <= maxSize) {
            sentenceChunk += sentence;
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk);
            }
            sentenceChunk = sentence;
          }
        }
        
        currentChunk = sentenceChunk;
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

module.exports = {
  summarizeText
};

/**
 * Build a user message supporting optional image content for vision models
 * Falls back to plain text content when no images are provided.
 * The OpenRouter Chat Completions API accepts content as string or array of parts
 * compatible with OpenAI’s vision content format.
 */
function buildUserMessage(userPrompt, images) {
  if (!images || images.length === 0) {
    return { role: 'user', content: userPrompt };
  }
  // Build multi-part content with a text instruction and up to a few images
  const parts = [
    { type: 'text', text: `${userPrompt}\n\nConsider the following images as OPTIONAL supporting context.\nDo not transcribe them; extract only brief, high-signal labels/captions if they aid the summary:` }
  ];
  for (const img of images) {
    parts.push({ type: 'text', text: img.altText ? `Slide ${img.slideNumber}: ${img.altText}` : `Slide ${img.slideNumber}` });
    parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
  }
  return { role: 'user', content: parts };
}

/**
 * Heuristic check for whether a model likely supports images (vision)
 * This is best-effort; OpenRouter model naming commonly includes '4o'/'omni'/'vision'
 * You can expand/override this list via settings later.
 */
function modelSupportsVision(model) {
  if (!model || typeof model !== 'string') return false;
  const m = model.toLowerCase();
  return (
    // OpenAI/Orgs id forms
    m.includes('gpt-4o') || m.includes('gpt4o') ||
    // Common shorthand variants users type
    m.includes('4o') || m.includes('4-0') ||
    // General vision-capable model markers
    m.includes('omni') || m.includes('vision') ||
    // Anthropic
    m.includes('claude-3.5-sonnet') ||
    // OSS vision models
    m.includes('llava')
  );
}

module.exports.modelSupportsVision = modelSupportsVision;

/**
 * Answer a user question using ONLY the provided summary as context.
 * If the answer is not present in the summary, the model should say so.
 * @param {string} summary - The previously generated summary text
 * @param {string} question - The user's question
 * @param {string} apiKey - OpenRouter API key
 * @param {string} model - Model to use (defaults to gpt-4o-mini via OpenRouter)
 * @param {function|null} onProgress - optional streaming callback
 * @returns {Promise<string>} - The model's answer
 */
async function answerQuestionAboutSummary(summary, question, apiKey, model = 'openai/gpt-4o-mini', onProgress = null) {
  const openai = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/yourusername/squailor',
      'X-Title': 'Squailor Document Summarizer'
    }
  });

  const systemPrompt = `You are a helpful study assistant.
You will be given a SUMMARY of a document and a USER QUESTION.
Answer strictly using the information present in the SUMMARY.
Do NOT invent information that is not stated or clearly implied by the summary.
If the summary does not contain enough information to answer, reply: "I don't have enough information from the summary to answer that."`;

  const userPrompt = `SUMMARY:\n\n${summary}\n\nQUESTION: ${question}\n\nINSTRUCTIONS:\n- Base your answer ONLY on the SUMMARY above.\n- Be concise but clear. If the answer requires steps, use a short list.\n- If uncertain or missing info, explicitly say you do not have enough information.`;

  try {
    // Try streaming first
    let full = '';
    try {
      const stream = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 800,
        stream: true
      });
      for await (const part of stream) {
        const delta = part?.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          if (typeof onProgress === 'function') onProgress({ type: 'delta', deltaText: delta, totalChars: full.length });
        }
      }
      if (typeof onProgress === 'function') onProgress({ type: 'done', totalChars: full.length });
      return full.trim();
    } catch (e) {
      const resp = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 800
      });
      return (resp.choices?.[0]?.message?.content || '').trim();
    }
  } catch (error) {
    // Mirror summarizeText error normalization
    if (error.message && error.message.includes('Rate limit')) {
      const waitTimeMatch = error.message.match(/Please try again in ([^.]+)/);
      const waitTime = waitTimeMatch ? waitTimeMatch[1] : 'some time';
      throw new Error(`RATE_LIMIT: You've hit your OpenAI API rate limit. Please wait ${waitTime} before trying again.`);
    }
    if (error.message && error.message.includes('insufficient_quota')) {
      throw new Error('QUOTA_EXCEEDED: Your OpenAI account has insufficient credits.');
    }
    if (error.message && error.message.includes('invalid_api_key')) {
      throw new Error('INVALID_API_KEY: Your API key is invalid or has been revoked.');
    }
    throw new Error(`AI Q&A failed: ${error.message}`);
  }
}

module.exports.answerQuestionAboutSummary = answerQuestionAboutSummary;
