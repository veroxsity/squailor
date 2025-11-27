const { trimMcqsFromText } = require('../../src/utils/mcq');

describe('trimMcqsFromText', () => {
  test('trims to exact number of MCQs when asked', () => {
    const text = `Summary: Short info\n\n1) What is X?\nA) 1\nB) 2\n\n2) What is Y?\nA) A\nB) B\n\n3) Which one?\nA) True\nB) False`;
    const out = trimMcqsFromText(text, 2);
    expect(out).toContain('Summary: Short info');
    expect(out).toContain('1) What is X?');
    expect(out).toContain('2) What is Y?');
    expect(out).not.toContain('3) Which one?');
  });

  test('returns original text if less than or equal questions present', () => {
    const text = `Intro\n\n1) Q?\nA) x\n\n2) Q2?\nA) y`;
    const out = trimMcqsFromText(text, 5);
    expect(out).toBe(text);
  });

  test('handles headings like "MCQs" and trims accordingly', () => {
    const text = `Some intro\nMCQs\nQ1: Alpha?\nA) ..\n\nQ2: Beta?\nA) ..\n\nQ3: Gamma?\nA) ..`;
    const out = trimMcqsFromText(text, 1);
    expect(out).toContain('Some intro');
    expect(out).toContain('Q1: Alpha?');
    expect(out).not.toContain('Q2: Beta?');
  });

  test('trims JSON-formatted MCQs found in text', () => {
    const json = JSON.stringify({
      intro: 'JSON intro',
      questions: [
        { question: 'Q1', options: [{label:'A',text:'a'}], correctLabel: 'A' },
        { question: 'Q2', options: [{label:'A',text:'a'}], correctLabel: 'A' },
        { question: 'Q3', options: [{label:'A',text:'a'}], correctLabel: 'A' },
        { question: 'Q4', options: [{label:'A',text:'a'}], correctLabel: 'A' }
      ]
    }, null, 2);
    const text = `Study\n\n` + json;
    const out = trimMcqsFromText(text, 2);
    // Should contain JSON trimmed to 2 questions
    const parsed = JSON.parse(out.match(/\{[\s\S]*\}/)[0]);
    expect(parsed.questions.length).toBe(2);
  });
});
