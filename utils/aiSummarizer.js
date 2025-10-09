const OpenAI = require('openai');

/**
 * Summarize text using OpenRouter API
 * @param {string} text - Text to summarize
 * @param {string} summaryType - Type of summary ('normal' or 'short')
 * @param {string} apiKey - OpenRouter API key
 * @param {string} responseTone - Tone of response ('casual', 'formal', 'informative', 'easy')
 * @param {string} model - Model to use (defaults to gpt-4o-mini via OpenRouter)
 * @param {string} summaryStyle - Style of summary ('teaching' or 'notes')
 * @returns {Promise<string>} - Summary text
 */
// onProgress: optional callback({ type: 'delta'|'chunk-start'|'chunk-done'|'combine-start'|'done', deltaText?, totalChars? , chunkIndex?, totalChunks? })
async function summarizeText(text, summaryType, apiKey, responseTone = 'casual', model = 'openai/gpt-4o-mini', summaryStyle = 'teaching', onProgress = null) {
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
Aim to capture at least 70-80% of the original content's depth and detail.`;

      userPrompt = `Please create COMPREHENSIVE, IN-DEPTH NOTES from the following content.
Write as if you're a diligent student taking detailed notes during an important lecture where you want to capture EVERYTHING.

IMPORTANT INSTRUCTIONS:
- Be THOROUGH - don't just list points, expand on them with full explanations
- Include ALL important details, concepts, definitions, examples, and context
- Write complete thoughts and explanations, not just short phrases
- Aim for comprehensive coverage - your notes should allow someone to learn the topic deeply
- Use nested bullet points with DETAILED explanations at each level
- Don't skip over ideas - elaborate and explain fully
- Target: Retain 70-80% of the original content's information density

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
Aim to preserve 70-80% of the original content's depth while making it clearer and better organized.`;

      userPrompt = `Please create an EXTENSIVE, IN-DEPTH EXPLANATION of the following content.

IMPORTANT INSTRUCTIONS:
- Write in FULL PARAGRAPHS with thorough explanations, not bullet points
- Explain concepts completely - as if writing a detailed textbook chapter
- Include ALL important information: concepts, definitions, examples, context, implications
- Be comprehensive - don't skip over ideas, elaborate on everything important
- Use clear headings and sections, but write detailed explanatory paragraphs under each
- Aim for depth and thoroughness - someone should be able to learn this topic deeply from your explanation
- Target: Retain 70-80% of the original content's information density

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

Content:
${text}`;
    }
  }

  try {
    // Split text into chunks if it's too long (GPT has token limits)
    const maxChunkSize = 12000; // Conservative limit for GPT-4
    const chunks = splitTextIntoChunks(text, maxChunkSize);

    if (chunks.length === 1) {
      // Single chunk - process normally
      // Adjust max tokens based on summary type
      let maxTokens = 3000; // Normal
      if (summaryType === 'short') {
        maxTokens = 1000;
      } else if (summaryType === 'longer') {
        maxTokens = 8000; // Much higher for longer, comprehensive summaries
      }
      
      // Try streaming for live feedback; fallback to non-streaming if not supported
      let full = '';
      try {
        const stream = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
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
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
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
        chunkMaxTokens = 4000; // Much higher for comprehensive chunks
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
        const combinedPrompt = `Please combine and consolidate these summaries into a single, 
coherent ${summaryType === 'longer' ? 'comprehensive and detailed' : ''} summary. 
${summaryType === 'longer' ? 'Maintain ALL details and explanations. Write thorough paragraphs, not just bullet points.' : 'Remove any redundancy while maintaining all key information.'}

${chunkSummaries.map((s, i) => `Part ${i + 1}:\n${s}`).join('\n\n')}`;

        // Adjust final combination token limits
        let finalMaxTokens = 3000; // Normal
        if (summaryType === 'short') {
          finalMaxTokens = 1000;
        } else if (summaryType === 'longer') {
          finalMaxTokens = 8000; // Much higher for comprehensive final output
        }

        if (typeof onProgress === 'function') onProgress({ type: 'combine-start' });
        const finalResponse = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: combinedPrompt }
          ],
          temperature: 0.3,
          max_tokens: finalMaxTokens
        });
        const final = finalResponse.choices[0].message.content.trim();
        if (typeof onProgress === 'function') onProgress({ type: 'done', totalChars: final.length });
        return final;
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
