const { parseMcqsFromText } = require('../../src/utils/mcq');

describe('parseMcqsFromText', () => {
  test('parses labeled options and answer', () => {
    const text = `Intro text\n\n1) What is 2+2?\nA) 3\nB) 4\nC) 5\nAnswer: B\nExplanation: 2+2 equals 4.`;
    const parsed = parseMcqsFromText(text);
    expect(parsed.intro).toContain('Intro text');
    expect(parsed.questions.length).toBe(1);
    const q = parsed.questions[0];
    expect(q.question).toContain('What is 2+2');
    expect(q.options.length).toBe(3);
    expect(q.options[1].label).toBe('B');
    expect(q.correctLabel).toBe('B');
    expect(q.explanation).toContain('2+2 equals 4');
  });

  test('parses Answer line with full text and maps to option label', () => {
    const text = `Intro\n\n1) What is blue?\nA) Red\nB) Blue\nC) Green\nAnswer: Blue\nExplanation: obvious`;
    const parsed = parseMcqsFromText(text);
    expect(parsed.questions.length).toBe(1);
    expect(parsed.questions[0].correctLabel).toBe('B');
    expect(parsed.questions[0].answerText).toContain('Blue');
  });

  test('parses bullet options and detects correct marker', () => {
    const text = `Summary\n\nQ1) Which is true?\n- Alpha\n- Beta*\n- Gamma`;
    const parsed = parseMcqsFromText(text);
    expect(parsed.questions.length).toBe(1);
    const q = parsed.questions[0];
    expect(q.options.length).toBe(3);
    expect(q.correctLabel).toBe('B');
  });

  test('returns empty when no questions found', () => {
    const text = 'Just a summary with no questions.';
    const parsed = parseMcqsFromText(text);
    expect(parsed.questions.length).toBe(0);
    expect(parsed.intro).toContain('Just a summary');
  });

  test('parses JSON formatted MCQs when the model returns JSON directly', () => {
    const json = JSON.stringify({
      intro: 'Short summary',
      questions: [
        { question: 'Pick a color', options: [{ label: 'A', text: 'Red' }, { label: 'B', text: 'Blue' }], correctLabel: 'B', answerText: 'Blue', explanation: 'Blue is the color' }
      ]
    });
    const parsed = parseMcqsFromText(json);
    expect(parsed.intro).toBe('Short summary');
    expect(parsed.questions.length).toBe(1);
    expect(parsed.questions[0].correctLabel).toBe('B');
  });

  test('parses JSON inside a ```json code fence', () => {
    const json = JSON.stringify({
      intro: 'Fenced',
      questions: [ { question: 'Q?', options: [{ label: 'A', text: 'Yes' }], correctLabel: 'A' } ]
    }, null, 2);
    const wrapped = 'Some intro\n\n```json\n' + json + '\n```\n';
    const parsed = parseMcqsFromText(wrapped);
    expect(parsed.intro).toBe('Fenced');
    expect(parsed.questions.length).toBe(1);
    expect(parsed.questions[0].options[0].label).toBe('A');
  });

  test('parses Answer line wrapped in bold markers', () => {
    const text = `Intro\n\n1) Which number is even?\nA) 1\nB) 2\nC) 3\n**Correct Answer: B**\n*Explanation: 2 is even.*`;
    const parsed = parseMcqsFromText(text);
    expect(parsed.questions.length).toBe(1);
    expect(parsed.questions[0].correctLabel).toBe('B');
    expect(parsed.questions[0].explanation).toContain('2 is even');
  });
});
