'use strict';

/**
 * Tone-specific instructions for summaries
 */
const TONE_INSTRUCTIONS = {
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
  eli5: {
    style: 'extremely simple and beginner-friendly',
    instructions: 'Explain Like I\'m 5: Use the simplest possible language, avoiding ALL jargon and technical terms. If you must use a technical term, immediately explain it using everyday words that a child could understand. Use analogies and examples from daily life. Break down every concept into the most basic building blocks. Imagine explaining to someone with absolutely no background in the subject.'
  }
};

/**
 * Get tone instructions by key
 * @param {string} tone - Tone key (casual, formal, informative, eli5)
 * @returns {Object} Tone configuration
 */
function getToneInstructions(tone) {
  return TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.casual;
}

/**
 * Style-specific instructions factory
 * @param {string} summaryType - Type of summary (short, normal, longer)
 * @returns {Object} Style configurations
 */
function getStyleInstructions(summaryType) {
  return {
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
    },
    mcqs: {
      format: 'multiple-choice questions',
      instructions: 'Generate a short, focused study summary followed by a set of multiple-choice questions (MCQs) based on the content. Each question should have 3–4 plausible answer options and an explicit correct answer with a brief explanation. When a mcqCount is provided in options, generate that many MCQs; default to 5 if not specified.'
    }
  };
}

/**
 * Build system and user prompts for summarization
 * @param {Object} options - Prompt building options
 * @returns {Object} { systemPrompt, userPrompt }
 */
function buildSummaryPrompts(options) {
  const {
    summaryType,
    summaryStyle,
    responseTone,
    text,
    mcqCount = 5,
    minWordsTarget = 0,
    maxWordsTarget = 0
  } = options;

  const selectedTone = getToneInstructions(responseTone);
  const styleInstructions = getStyleInstructions(summaryType);
  const selectedStyle = styleInstructions[summaryStyle] || styleInstructions.teaching;

  let systemPrompt = '';
  let userPrompt = '';

  if (summaryType === 'short') {
    ({ systemPrompt, userPrompt } = buildShortPrompts({
      summaryStyle, selectedTone, selectedStyle, text, mcqCount
    }));
  } else if (summaryType === 'longer') {
    ({ systemPrompt, userPrompt } = buildLongerPrompts({
      summaryStyle, selectedTone, selectedStyle, text, mcqCount, minWordsTarget, maxWordsTarget
    }));
  } else {
    ({ systemPrompt, userPrompt } = buildNormalPrompts({
      summaryStyle, selectedTone, selectedStyle, text, mcqCount, minWordsTarget, maxWordsTarget
    }));
  }

  return { systemPrompt, userPrompt };
}

/**
 * Build prompts for short summaries
 */
function buildShortPrompts({ summaryStyle, selectedTone, selectedStyle, text, mcqCount }) {
  let systemPrompt = '';
  let userPrompt = '';

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
  } else if (summaryStyle === 'mcqs') {
    systemPrompt = `You are an expert at creating concise study prompts and multiple-choice questions in a ${selectedTone.style} tone. ${selectedTone.instructions} ${selectedStyle.instructions}`;
    userPrompt = `Please create a SHORT study summary followed by EXACTLY ${mcqCount} high-quality multiple-choice questions based on the content below (no more, no fewer). IMPORTANT: Return ONLY valid JSON that exactly matches this schema:

{
  "intro": "<short summary text>",
  "questions": [
    {
      "question": "...",
      "options": [ { "label": "A", "text": "..." }, ... ],
      "correctLabel": "A",
      "answerText": "<optional full text answer>",
      "explanation": "short explanation (1-2 sentences)"
    }
  ]
}

If required, you may wrap ONLY the JSON in a single code fence labeled json (use a three-backtick fence) code fence. Do NOT include any additional text outside the JSON. Use a ${selectedTone.style} tone for the content.

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

  return { systemPrompt, userPrompt };
}

/**
 * Build prompts for longer/comprehensive summaries
 */
function buildLongerPrompts({ summaryStyle, selectedTone, selectedStyle, text, mcqCount, minWordsTarget, maxWordsTarget }) {
  let systemPrompt = '';
  let userPrompt = '';

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
  } else if (summaryStyle === 'mcqs') {
    systemPrompt = `You are an expert at educational content and question generation, producing a detailed study summary then ${mcqCount} insightful multiple-choice questions with plausible distractors and answer explanations. ${selectedTone.instructions}`;
    userPrompt = `Please create an EXTENDED study summary and then generate EXACTLY ${mcqCount} multiple-choice questions with 3-4 plausible options each based on the content below (no more, no fewer). IMPORTANT: Return ONLY valid JSON that exactly matches this schema:

{
  "intro": "<detailed summary text>",
  "questions": [
    {
      "question": "...",
      "options": [ { "label": "A", "text": "..." }, ... ],
      "correctLabel": "A",
      "answerText": "<optional full text answer>",
      "explanation": "short explanation"
    }
  ]
}

If direct JSON can't be produced, wrap ONLY the JSON in a single code fence labeled json (use a three-backtick fence) code fence. Do NOT include any extra text beyond the JSON. Maintain ${selectedTone.style} tone.

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

  return { systemPrompt, userPrompt };
}

/**
 * Build prompts for normal summaries
 */
function buildNormalPrompts({ summaryStyle, selectedTone, selectedStyle, text, mcqCount, minWordsTarget, maxWordsTarget }) {
  let systemPrompt = '';
  let userPrompt = '';

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
  } else if (summaryStyle === 'mcqs') {
    systemPrompt = `You are an expert at summarizing and creating MCQs in a ${selectedTone.style} manner. After a concise summary, create ${mcqCount} multiple-choice questions with 3-4 options each, label the correct option and add a one-line explanation.`;
    userPrompt = `Please produce a DETAILED summary followed by EXACTLY ${mcqCount} multiple-choice questions based on the text below (no more, no fewer). IMPORTANT: Return ONLY valid JSON that exactly matches this schema:

{
  "intro": "<detailed summary text>",
  "questions": [
    {
      "question": "...",
      "options": [ { "label": "A", "text": "..." }, ... ],
      "correctLabel": "A",
      "answerText": "<optional full text answer>",
      "explanation": "brief explanation"
    }
  ]
}

If direct JSON is impossible, wrap ONLY the JSON in a single code fence labeled json (use a three-backtick fence) code fence. Do NOT include any other commentary outside the JSON.

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
${minWordsTarget > 0 ? `\nLENGTH TARGET: At minimum, write ${minWordsTarget.toLocaleString()} words and up to about ${maxWordsTarget.toLocaleString()} words if needed. Avoid aggressive compression; preserve nuance and detail.` : ''}

Content:
${text}`;
  }

  return { systemPrompt, userPrompt };
}

/**
 * Add image guidance to prompts
 * @param {string} systemPrompt - Current system prompt
 * @param {string} userPrompt - Current user prompt
 * @returns {Object} Modified prompts
 */
function addImageGuidance(systemPrompt, userPrompt) {
  const modifiedSystem = systemPrompt + `

Image usage guidance:
- PRIORITIZE the provided document text for summarization.
- Treat images as supplementary context only.
- Do NOT output a separate OCR transcript or verbatim dump of image text.
- If images contain key labels, headings, or brief captions that materially improve understanding, integrate those succinctly into the summary/notes.
- Do not over-index on images; they should aid, not dominate, the output.`;

  const modifiedUser = `Use the attached images only to clarify or enrich the output when they add value.
Do not transcribe images verbatim or create a separate transcription section.
Focus on summarizing the provided document text; incorporate only essential details from images when relevant.

` + userPrompt;

  return { systemPrompt: modifiedSystem, userPrompt: modifiedUser };
}

/**
 * Build the combination prompt for merging chunk summaries
 */
function buildCombinePrompt(options) {
  const { summaryStyle, selectedTone, selectedStyle, chunkSummaries, mcqCount } = options;

  let combinePrompt;

  if (summaryStyle === 'mcqs') {
    const combinedParts = chunkSummaries.join('\n\n---\n\n');
    combinePrompt = `Below are partial summaries from multiple parts of a document. Please synthesize them into ONE cohesive study summary followed by EXACTLY ${mcqCount} multiple-choice questions based on the ENTIRE original document (no more, no fewer).

IMPORTANT: Return ONLY valid JSON that exactly matches this schema:

{
  "intro": "<combined summary text>",
  "questions": [
    {
      "question": "...",
      "options": [ { "label": "A", "text": "..." }, ... ],
      "correctLabel": "A",
      "answerText": "<optional full text answer>",
      "explanation": "brief explanation"
    }
  ]
}

Partial summaries:
${combinedParts}`;
  } else {
    combinePrompt = `Below are summaries of different parts of the same document. 
Please combine them into a single, cohesive ${selectedStyle.format} that:
1. Maintains all important information from each part
2. Uses a ${selectedTone.style} writing style
3. Is well-organized with clear structure
4. Removes any redundancy while preserving completeness

Part summaries:
${chunkSummaries.map((s, i) => `=== Part ${i + 1} ===\n${s}`).join('\n\n')}

Please provide the combined summary:`;
  }

  return combinePrompt;
}

module.exports = {
  TONE_INSTRUCTIONS,
  getToneInstructions,
  getStyleInstructions,
  buildSummaryPrompts,
  buildShortPrompts,
  buildLongerPrompts,
  buildNormalPrompts,
  addImageGuidance,
  buildCombinePrompt
};
