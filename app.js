// ============================================================================
//  app.js  -  Vocabulary Worksheet Generator
//  Builds a DeepSeek prompt from the "Vocabulary Worksheet Prompt" library and
//  streams the finished worksheet back into the page.
//  (Put your API key in config.js, NOT here.)
// ============================================================================

// ---------------------------------------------------------------------------
//  1. MASTER INSTRUCTIONS
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  "You are an expert English vocabulary worksheet generator for primary-school " +
  "students (about Grade 4 reading level). You follow the user's formatting " +
  "instructions EXACTLY and produce clean, print-ready worksheets with no extra " +
  "commentary, no teacher notes and no code fences.";

const OUTPUT_RULES_HEAD = [
  "OUTPUT FORMAT (follow exactly):",
  "- Output ONLY the finished worksheet. No introduction, no teacher notes, no explanation, no code fences.",
  "- Use clean plain text that can be copied and pasted straight into Google Docs and printed.",
  "- Do NOT use Markdown symbols such as #, *, backticks or >. The only special mark you may use is ' | ' as the two-column separator described below.",
];

const OUTPUT_RULES_NEW_WORDS = [
  "- Begin DIRECTLY with the heading 'New Words'. Do NOT add any worksheet title, and never write 'Vocabulary Worksheet', 'Grade 5', a Name line or a Date line.",
  "- Use exactly these headings, in this order:",
  "    New Words",
  "    Section A: <exercise title>",
  "    Section B: <exercise title>",
  "    Section C: <exercise title>",
  "    Section D: <exercise title>",
  "    Section E: <exercise title>",
  "- Structure of the New Words section (follow exactly):",
  "    * For each new word write:  word (part of speech): short meaning.   Then give 2 example sentences, one per line, each starting with '-'.",
  "    * Then write 'Practices: Fill in each blank with the correct new word or word form.' followed by the fill-in-the-blank questions, each on its own line starting with '-'.",
  "    * Then write 'Write each new word ten times:' and, for each new word, print the word followed by a long line of underscores, then a second line containing only underscores.",
];

// Study mode: review only - no New Words block, and Sections A-E only.
const OUTPUT_RULES_STUDY = [
  "- Begin DIRECTLY with the heading 'Section A'. Do NOT add any worksheet title, and never write 'Vocabulary Worksheet', 'Grade 5', a Name line or a Date line.",
  "- This worksheet has NO 'New Words' section. Do not explain, introduce or give examples for any word; it is review practice only.",
  "- Use exactly these headings, in this order:",
  "    Section A: <exercise title>",
  "    Section B: <exercise title>",
  "    Section C: <exercise title>",
  "    Section D: <exercise title>",
  "    Section E: <exercise title>",
];

const OUTPUT_RULES_TAIL = [
  "- MULTIPLE CHOICE RULES: mix up the correct answers so they are spread randomly across A, B, C and D. Never let the correct answer be A every time. Every question must be brand new. Within one question, no answer choice may repeat a word used in another choice (do NOT offer, for example, 'pity/ruffian', 'pity/slate', 'pity/hedge'). Only a 'choose the correct word form' question may list different forms of the one target word.",
  "- TWO-COLUMN / MATCHING activities: write every row on a single line, separating the left column from the right column with ' | ', and number the rows, for example:   1. topple | The wind made the tower ______.",
  "- WRITING SPACE: whenever a question asks the student to write or rewrite a sentence (not just fill one blank), put a long row of underscores as a writing space right after the prompt.",
  "- WORD BANK: where an exercise needs the list of words, add exactly one row at the end of that section labelled 'Word Bank:' with the words separated by commas. Never write 'answer key', and never add any note or explanation for the teacher.",
  "- Keep the worksheet COMPACT to save printer paper: do NOT leave blank lines between individual questions. Use at most one blank line, and only before a new Section heading.",
];

function outputRules(studyMode) {
  return OUTPUT_RULES_HEAD.concat(
    studyMode ? OUTPUT_RULES_STUDY : OUTPUT_RULES_NEW_WORDS,
    OUTPUT_RULES_TAIL
  ).join("\n");
}

// ---------------------------------------------------------------------------
//  2. PROMPT LIBRARY  (mirrors "# Vocabulary Worksheet Prompt.txt")
// ---------------------------------------------------------------------------

const SECTION_1 = {
  explanation: (nw) =>
    "Write short explanations at a Grade 4 reading level for the words: " + nw.join(", ") + ".\n" +
    "For each word, show its part of speech in brackets and a short meaning, then give 2 " +
    "example sentences (each on its own line starting with '-').\n" +
    "For verbs, please write the examples in different tenses.",

  fillBlank: (nw) =>
    "Make " + (nw.length * 2) + " fill-in-the-blank sentence questions for these " +
    nw.length + " new words, with 2 questions per word. Mix the order.\n" +
    "Label this part 'Practices: Fill in each blank with the correct new word or word form.' " +
    "and write each question on its own line starting with '-'.\n" +
    "Verbs can be used in different tenses.",

  writing: (nw) =>
    "Add the heading 'Write each new word ten times:'. For each new word (" + nw.join(", ") +
    "), print the word followed by a long line of underscores, then a second line that is " +
    "only underscores, so the student can write the word 10 times.",
};

const SECTION_2 = {
  A: {
    title: "Complete the Word",
    build: (w) =>
      "Can you make Complete the Word questions for the following words?\n" +
      "Format each question like:  S ____________________ (Not obvious)\n" +
      "Show the first letter of the word, such as S for \"subtle\", followed by a long " +
      "underline and a synonym or short hint in round brackets.\n" +
      "Make the underlines long enough for students to write the answers.\n" +
      "At the end, add one row starting with 'Word Bank:' followed by the words in randomized order, separated by commas.\n" +
      "Word list: " + w.join(", "),
  },
  B: {
    title: "Fill in the Blank",
    build: (w) =>
      "Can you make fill-in-the-blank sentence questions for the following words?\n" +
      "Verbs can be used in different tenses.\n" +
      "At the end, add one row starting with 'Word Bank:' followed by the answers in randomized order, separated by commas.\n" +
      "Word list: " + w.join(", "),
  },
  C: {
    title: "Multiple Choice - Correct Word Form",
    build: (w) =>
      "Make multiple-choice sentence questions using new sentences that have not been " +
      "used previously for the same word list.\n" +
      "Students must choose the correct word form.\n" +
      "- For verbs, provide different tenses, such as bulge, bulging, bulged.\n" +
      "- For nouns, provide different forms, including incorrect forms where appropriate.\n" +
      "- Mix up the choices so the correct answer is spread randomly across A, B and C (not always A).\n" +
      "Word list: " + w.join(", "),
  },
  D: {
    title: "Multiple Choice - Antonyms",
    build: (w) =>
      "Write multiple-choice questions for the same word list to find the correct antonym.\n" +
      "Use this format:  topsy-turvy  a) disorder  b) orderly  c) messy\n" +
      "Mix up the choices so the correct answer is spread randomly across a, b and c (not always a), and every choice must be a different word.\n" +
      "Word list: " + w.join(", "),
  },
  E: {
    title: "Multiple Choice - Unrelated Word",
    build: (w) =>
      "Write multiple-choice questions for the following word list. Students must " +
      "identify the unrelated word.\n" +
      "Use this format:  Prance  a) walk  b) strut  c) shout  d) stride\n" +
      "Mix up the choices so the correct answer is spread randomly across a, b, c and d (not always a), and every choice must be a different word.\n" +
      "Word list: " + w.join(", "),
  },
  F: {
    title: "Find the Synonyms",
    build: (w) =>
      "Make synonym questions for the following word list.\n" +
      "Write the vocabulary words in one row or column, followed by a randomized word " +
      "list of their synonyms.\n" +
      "Use this format:  bully ______   oppose _______\n" +
      "Word list: " + w.join(", "),
  },
  G: {
    title: "Double-Word Multiple Choice Sentences",
    build: (w) =>
      "Write " + Math.ceil(w.length / 2) + " double-word multiple-choice sentence questions " +
      "using the following words, grouped into randomized pairs.\n" +
      "Use each word exactly once, with no duplicates.\n" +
      "Verbs can be used in different tenses.\n" +
      "Mix up the correct answers across A, B, C and D (not always A). Each choice must be a different word pair; never repeat the same word across the choices of one question.\n" +
      "Word list: " + w.join(", "),
  },
  H: {
    title: "Rewrite the Boring Sentence",
    build: (w) =>
      "Make \"Rewrite the Boring Sentence\" questions using 2 simple, overused words " +
      "per question, which students must replace with words from the vocabulary list.\n" +
      "Write all " + Math.ceil(w.length / 2) + " questions so that all " + w.length +
      " vocabulary words are used exactly once, with exactly 2 vocabulary words per question.\n" +
      "- Verbs can be written in different tenses.\n" +
      "- Adverbs and adjectives can be used interchangeably.\n" +
      "Word list: " + w.join(", "),
  },
};

const SECTION_3 = {
  A: {
    title: "Match Words to Sentences",
    build: (w) =>
      "Make mix-and-match word and sentence questions for the same vocabulary words.\n" +
      "- Put the vocabulary words in one column.\n" +
      "- Put sentences with fill-in-the-blank underlines in the other column.\n" +
      "Word list: " + w.join(", "),
  },
  B: {
    title: "Match Words to Synonyms",
    build: (w) =>
      "Make mix-and-match synonym questions for the same vocabulary words.\n" +
      "- Put the vocabulary words in one column.\n" +
      "- Put the randomized synonyms in the other column.\n" +
      "- Use single-word synonyms as much as possible.\n" +
      "Word list: " + w.join(", "),
  },
  C: {
    title: "Match Words to Definitions",
    build: (w) =>
      "Make mix-and-match word and definition questions for the following words.\n" +
      "- Put the vocabulary words in one column.\n" +
      "- Put the definitions in the other column.\n" +
      "- Randomize the definitions so that they do not align with the correct words.\n" +
      "Word list: " + w.join(", "),
  },
  D: {
    title: "Connect the Word Family",
    build: (w) =>
      "Make Connect the Word Family questions for the words: " + w.join(", ") + ".\n" +
      "Use accurate, standard word-family forms (adjective, verb, adverb and noun " +
      "forms where applicable).\n" +
      "Use the following format:\n" +
      "- Put each word form in the left column, with each form on a separate row.\n" +
      "- Put example sentences containing underlines for the corresponding word forms " +
      "in the right column.\n" +
      "- Include the different adjective, verb, adverb and noun forms where applicable.\n" +
      "- Randomize the example sentences.\n" +
      "Example:\n" +
      "    copious   ...   She took ______ notes during the lesson.\n" +
      "    copiously ...   It rained ______ throughout the afternoon.\n" +
      "Repeat the format for all words.",
  },
  E: {
    title: "Word Family Practice",
    build: (w) =>
      "Make Write the Word Family questions.\n" +
      "- Write each vocabulary word's family members on the same row, separated by spaces.\n" +
      "- Vary the word forms and tenses, such as alter, altered, alteration.\n" +
      "- Write sentence questions in mixed order on consecutive lines, with blanks for " +
      "students to fill in the correct word forms.\n" +
      "- Repeat for every word family.\n" +
      "Word list: " + w.join(", "),
  },
  F: {
    title: "Match the Word Family",
    build: (w) =>
      "Make match-the-word-family questions for the words: " + w.join(", ") + ".\n" +
      "- Write multiple-choice sentence questions with underlines for the missing words.\n" +
      "- Provide choices containing different noun, verb, adjective or adverb forms of " +
      "the same word.\n" +
      "- Make 2 questions per word.\n" +
      "- Randomize the question order.",
  },
};

const SECTION_4 = {
  A: {
    title: "Find the Mistake",
    build: (w) =>
      "Make \"Find the Mistake\" questions for the following words.\n" +
      "Each sentence must contain one vocabulary word used incorrectly in place of another " +
      "appropriate word.\n" +
      "Use this format:  The older persistence cannot understand how much kids love phone games. (_______)\n" +
      "The incorrect word is persistence. Students should write generation in the brackets.\n" +
      "Requirements:\n" +
      "- Use every vocabulary word exactly once as an incorrect word.\n" +
      "- Mix the question order so that it is not easily predictable.\n" +
      "- Verbs can be used in different tenses.\n" +
      "Word list: " + w.join(", "),
  },
  B: {
    title: "Find the Mistake - Two-Step Activity",
    build: (w) =>
      "Make a two-step \"Find the Mistake\" activity for the following words.\n" +
      "STEP 1 - Fill in the Blank: make fill-in-the-blank sentence questions for these words. " +
      "Verbs can be used in different tenses. At the end, add one row starting with 'Word Bank:' " +
      "followed by the answers in randomized order, separated by commas.\n" +
      "STEP 2 - Insert the Wrong Vocabulary Words: write the sentences again, filling in the " +
      "blanks with incorrect vocabulary words from the same word list. Use every vocabulary " +
      "word exactly once as a wrong word.\n" +
      "Word list: " + w.join(", "),
  },
  C: {
    title: "Multiple Choice - Correct Verb Tense",
    build: (w) =>
      "Make multiple-choice sentence questions using the following word list.\n" +
      "Students must choose the correct verb tense.\n" +
      "- Provide different verb tenses as answer choices.\n" +
      "- Mix up the choices so the correct answer is spread randomly across A, B, C and D (not always A), and every choice must be a different verb form of the target word.\n" +
      "Word list: " + w.join(", "),
  },
  D: {
    title: "Multiple Choice - Correct Word Form",
    build: (w) =>
      "Make multiple-choice sentence questions for the following word list to find the " +
      "correct word form.\n" +
      "- Verbs: different tenses, such as stimulating, stimulate, stimulated.\n" +
      "- Adjectives and adverbs: different forms, such as smug, smugly, smugful.\n" +
      "- Nouns: different forms where possible, such as architecture, architect, architectural.\n" +
      "- Mix up the choices so the correct answer is spread randomly across A, B, C and D (not always A).\n" +
      "Word list: " + w.join(", "),
  },
  E: {
    title: "Find the Mistake - Word Form, Tense or Spelling",
    build: (w) =>
      "Make Find the Mistake questions for the following words.\n" +
      "Each sentence must contain a vocabulary word with an incorrect form, tense or spelling.\n" +
      "Use this format:\n" +
      "The heavy rain caused the stream to overflow like a torrential. (_______)\n" +
      "He is gnash his teeth out of pain. (_______)\n" +
      "We climbed into the trentch to hide from the bully. (_______)\n" +
      "Students should identify and correct the mistake.\n" +
      "Word list: " + w.join(", "),
  },
};

const SECTION_5 = {
  A: {
    title: "Convert Word Forms in a Story",
    build: (w, setting) =>
      "First write a short story (about 100 words) for Grade 4 students set in: " +
      (setting || "a simple, age-appropriate setting") + ". Use the vocabulary words " +
      "naturally where possible (" + w.join(", ") + ").\n" +
      "Then add this task for the student:\n" +
      "\"Rewrite the story and make the following changes:\"\n" +
      "- Convert 1 verb to the past tense.\n" +
      "- Convert 1 verb to the third-person singular form.\n" +
      "- Convert 1 verb to the continuous tense, either past or present.\n" +
      "- Convert 1 adjective into an adverb.\n" +
      "Keep the rest of the story unchanged unless a small adjustment is needed for " +
      "grammatical correctness.",
  },
  B: {
    title: "Fill in the Story",
    build: (w, setting) =>
      "Can you make a 250-word fill-in-the-blank story about " +
      (setting || "a simple, age-appropriate setting") + " using the following " +
      "vocabulary words? (" + w.join(", ") + ")\n" +
      "Requirements:\n" +
      "- Use every vocabulary word exactly once, with no duplicates.\n" +
      "- Replace each vocabulary word with an underline for students to fill in.\n" +
      "- Add a short hint in brackets beside every underline.\n" +
      "- Put a sequence number before each underline.\n" +
      "Use this format:  ________ 1 (completely)\n" +
      "- Words may be used in different tenses.\n" +
      "- Where appropriate, words may be used as verbs, nouns, adjectives or adverbs.\n" +
      "- Add a randomized word bank at the end, labelled 'Word Bank:', with words separated by commas.",
  },
};

// ---------------------------------------------------------------------------
//  3. WHICH SECTIONS GET WHICH EXERCISES
//     Each section can be set to "auto" (AI picks) or a specific prompt key.
// ---------------------------------------------------------------------------
//
//  Each section's own group decides what "Auto" picks:
//    A, B -> Section 2 (Regular Vocabulary Questions)
//    C    -> Section 3 (Mix-and-Match)
//    D    -> Section 4 (Error Detection)
//    E    -> Section 5; auto defaults to Prompt B "Fill in the Story"
//  A manual pick may come from ANY group, so Section A can run
//  "Fill in the Story" (5-B) if you want it to.
//
const SELECT_GROUPS = [
  { key: "A", section: 2, autoLabel: "Auto - let the AI pick" },
  { key: "B", section: 2, autoLabel: "Auto - let the AI pick" },
  { key: "C", section: 3, autoLabel: "Auto - let the AI pick", exclude: ["D"] },
  { key: "D", section: 4, autoLabel: "Auto - let the AI pick" },
  { key: "E", section: 5, autoLabel: "Auto - Fill in the Story", autoPrompt: "B" },
];

// Every exercise the section dropdowns offer. "Connect the Word Family" (3-D)
// stays out: it needs the word-family PDFs, which the AI cannot read here.
const EXERCISE_BANKS = [
  { section: 2, label: "Regular vocabulary", exclude: [] },
  { section: 3, label: "Mix-and-match", exclude: ["D"] },
  { section: 4, label: "Error detection", exclude: [] },
  { section: 5, label: "Story", exclude: [] },
];

function groupFor(key) {
  return SELECT_GROUPS.find((g) => g.key === key);
}

// A dropdown value is "auto" or "s:<group number>:<prompt key>", e.g. "s:5:B".
function choiceValue(section, prompt) {
  return "s:" + section + ":" + prompt;
}

function parseChoice(value) {
  const m = /^s:(\d+):([A-Z])$/.exec(value || "");
  if (!m) return null;
  const bank = sectionMeta(m[1]);
  if (!bank || !bank[m[2]]) return null;
  return { section: Number(m[1]), prompt: m[2] };
}

// Same string the dropdown uses, so "already used" checks match option values.
function choiceId(choice) {
  return choiceValue(choice.section, choice.prompt);
}

// ---------------------------------------------------------------------------
//  4. HELPERS
// ---------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseWords(text) {
  const seen = new Set();
  const out = [];
  (text || "")
    .split(/[\s,;]+/)
    .map((w) => w.replace(/^[^A-Za-z'-]+|[^A-Za-z'-]+$/g, "").trim())
    .filter(Boolean)
    .forEach((w) => {
      const key = w.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(w);
      }
    });
  return out;
}

// Add words to a list without repeating one (case-insensitive).
function uniqueWords(list) {
  const seen = new Set();
  return list.filter((w) => {
    const key = String(w).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sectionMeta(name) {
  if (name === "2") return SECTION_2;
  if (name === "3") return SECTION_3;
  if (name === "4") return SECTION_4;
  if (name === "5") return SECTION_5;
  return null;
}

// selection = { A: "auto" | "s:5:B", B: ..., C: ..., D: ..., E: ... }
function resolvePlan(selection) {
  const chosen = {};
  const used = new Set();

  // 1) apply manual picks first so "auto" slots can dodge them
  for (const g of SELECT_GROUPS) {
    const pick = (selection && selection[g.key]) || "auto";
    if (pick === "auto") continue;
    const choice = parseChoice(pick);
    if (!choice) continue;
    chosen[g.key] = choice;
    used.add(choiceId(choice));
  }

  // 2) fill the "auto" slots without repeating an exercise anywhere
  for (const g of SELECT_GROUPS) {
    if (chosen[g.key]) continue;
    const bank = sectionMeta(String(g.section));

    if (g.autoPrompt && !used.has(choiceValue(g.section, g.autoPrompt))) {
      chosen[g.key] = { section: g.section, prompt: g.autoPrompt };
      used.add(choiceValue(g.section, g.autoPrompt));
      continue;
    }

    const exclude = new Set(g.exclude || []);
    const pool = shuffle(
      Object.keys(bank).filter((k) => !exclude.has(k) && !used.has(choiceValue(g.section, k)))
    );
    const prompt = pool[0] || Object.keys(bank)[0];
    chosen[g.key] = { section: g.section, prompt };
    used.add(choiceValue(g.section, prompt));
  }
  return chosen;
}

// Two sections set to exactly the same activity would print the same exercise twice.
function duplicateSections(plan) {
  const seen = new Map();
  for (const g of SELECT_GROUPS) {
    const choice = plan[g.key];
    if (!choice) continue;
    const id = choiceId(choice);
    if (seen.has(id)) return [seen.get(id), g.key, choice];
    seen.set(id, g.key);
  }
  return null;
}

function promptText(choice, words, setting) {
  const bank = sectionMeta(String(choice.section));
  if (!bank) return "";
  return bank[choice.prompt].build(words, setting);
}

function promptTitle(choice) {
  const bank = sectionMeta(String(choice.section));
  return bank[choice.prompt].title;
}

// ---------------------------------------------------------------------------
//  4b. FORMATTING + EXPORT HELPERS
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// Keep intentional column gaps (2+ spaces) even if a program ignores white-space.
function preserveSpaces(escaped) {
  return escaped.replace(/ {2,}/g, (m) => "&nbsp;".repeat(m.length));
}

// Trim trailing spaces, collapse extra blank lines. Keeps it compact for printing.
function cleanText(text) {
  return String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

function classifyLine(line) {
  const t = line.trim();
  if (/^new words\b/i.test(t)) return "h1";
  if (/^section\s+[a-e]\b/i.test(t)) return "h2";
  if (/^(practices|write each new word ten times|word list|word bank|answer key|step\s*\d)/i.test(t)) return "sub";
  if (/^[-*\u2022]\s+/.test(t)) return "bullet";
  if (/^\d+[.)]\s+/.test(t)) return "item";
  return "text";
}

// Turn the model's plain text into tidy HTML (blank lines dropped -> saves paper).
function renderWorksheetHTML(text) {
  const out = [];
  for (const raw of cleanText(text).split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const cols = line.split(/\s+\|\s+/);
    if (cols.length === 2 && cols[0].trim() && cols[1].trim()) {
      out.push(
        '<div class="wl-row"><div class="wl-col1">' +
          preserveSpaces(escapeHtml(cols[0].trim())) +
          '</div><div class="wl-col2">' +
          preserveSpaces(escapeHtml(cols[1].trim())) +
          "</div></div>"
      );
      continue;
    }
    out.push('<div class="wl-' + classifyLine(line) + '">' + preserveSpaces(escapeHtml(line)) + "</div>");
  }
  return out.join("");
}

function buildDownloadHTML(bodyHtml) {
  return [
    "<!DOCTYPE html>",
    '<html><head><meta charset="utf-8"><title>Vocabulary Worksheet</title>',
    "<style>",
    "@page { size: letter portrait; margin: 0.55in 0.7in; }",
    'body { font-family: Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.35; color: #000; margin: 0; }',
    ".wl-h1 { font-size: 15pt; font-weight: bold; text-align: center; margin: 0 0 7pt; }",
    ".wl-h2 { font-size: 12.5pt; font-weight: bold; margin: 11pt 0 3pt; padding-bottom: 1pt; border-bottom: 1.2pt solid #000; }",
    ".wl-sub { font-weight: bold; margin: 6pt 0 2pt; }",
    ".wl-text { margin: 0 0 1.5pt; white-space: pre-wrap; }",
    ".wl-bullet { margin: 0 0 1.5pt; padding-left: 14pt; text-indent: -14pt; white-space: pre-wrap; }",
    ".wl-item { margin: 0 0 1.5pt; padding-left: 16pt; text-indent: -16pt; white-space: pre-wrap; }",
    ".wl-row { display: flex; gap: 14pt; margin: 0 0 1.5pt; }",
    ".wl-col1 { flex: 0 0 34%; }",
    ".wl-col2 { flex: 1 1 auto; }",
    "</style></head><body>",
    bodyHtml,
    "</body></html>",
  ].join("\n");
}

function downloadWorksheet(filename, mime) {
  if (!rawWorksheet.trim()) return;
  const html = buildDownloadHTML(renderWorksheetHTML(rawWorksheet));
  const blob = new Blob(["\ufeff" + html], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function renderPreview() {
  if (!rawWorksheet.trim()) {
    els.output.innerHTML = "";
    return;
  }
  els.output.classList.remove("streaming");
  els.output.innerHTML = renderWorksheetHTML(rawWorksheet);
}

// ---------------------------------------------------------------------------
//  5. BUILD THE FULL WORKSHEET PROMPT
// ---------------------------------------------------------------------------

function buildPrompt({ newWords, words, setting, extra, plan, studyMode, mergeNew }) {
  const L = [];

  L.push(
    studyMode
      ? "Create a complete English vocabulary review worksheet with the sections below."
      : "Create a complete English vocabulary worksheet with the sections below."
  );
  L.push("Follow every instruction EXACTLY.");
  L.push("Below the instructions you will find finished REFERENCE EXAMPLES. Copy their style and format closely.");
  L.push("");
  if (!studyMode) {
    L.push("New words (" + newWords.length + "): " + newWords.join(", "));
  }
  L.push("Vocabulary words for Sections A-E (" + words.length + "): " + words.join(", "));
  if (studyMode) {
    L.push("STUDY MODE: there are no new words. Every Section A-E exercise must review only the vocabulary words listed above.");
  } else if (mergeNew) {
    L.push("The new words have been added to the Sections A-E vocabulary list above, so every Section A-E exercise MUST use them.");
  } else {
    L.push("Do NOT use the new words in Sections A-E. Those sections use only the vocabulary words listed above.");
  }
  L.push("Story setting / characters: " + (setting || "(not provided - use a simple, age-appropriate setting)"));
  L.push("Extra instructions: " + (extra || "(none)"));
  L.push("");

  if (!studyMode) {
    L.push("=====================================================");
    L.push("New Words");
    L.push("=====================================================");
    L.push("Part 1A - Word Explanations and Example Sentences:");
    L.push(SECTION_1.explanation(newWords));
    L.push("");
    L.push("Part 1B - Fill in the Blank (new words only):");
    L.push(SECTION_1.fillBlank(newWords));
    L.push("");
    L.push("Part 1C - Writing practice:");
    L.push(SECTION_1.writing(newWords));
    L.push("");
  }

  const labels = { A: "A", B: "B", C: "C", D: "D", E: "E" };
  for (const key of ["A", "B", "C", "D", "E"]) {
    const choice = plan[key];
    if (!choice) continue;
    L.push("=====================================================");
    L.push("Section " + labels[key] + ": " + promptTitle(choice));
    L.push("=====================================================");
    L.push(promptText(choice, words, setting));
    L.push("");
  }

  if (window.REFERENCE_EXAMPLES) {
    L.push("=====================================================");
    L.push("REFERENCE EXAMPLES (these are finished worksheets - copy this style and format exactly):");
    L.push("=====================================================");
    L.push(window.REFERENCE_EXAMPLES);
    L.push("");
  }

  L.push("=====================================================");
  L.push(outputRules(studyMode));

  return { prompt: L.join("\n"), plan };
}

// ---------------------------------------------------------------------------
//  6. DEEPSEEK STREAMING CALL
// ---------------------------------------------------------------------------

async function streamChat(endpoint, prompt, onToken) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + window.CONFIG.API_KEY,
    },
    body: JSON.stringify({
      model: window.CONFIG.MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      stream: true,
      temperature: window.CONFIG.TEMPERATURE,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("API error " + res.status + ": " + body.slice(0, 400));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line || !line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices && json.choices[0] && json.choices[0].delta;
        const piece = delta && delta.content ? delta.content : "";
        if (piece) onToken(piece);
      } catch (_) {
        // ignore keep-alive / partial lines
      }
    }
  }
}

// ---------------------------------------------------------------------------
//  7. UI WIRING
// ---------------------------------------------------------------------------

const els = {
  new1: $("#new1"),
  new2: $("#new2"),
  new3: $("#new3"),
  newWordGrid: $("#newWordGrid"),
  newWordsHint: $("#newWordsHint"),
  studyMode: $("#studyMode"),
  studyRow: $("#studyRow"),
  mergeNew: $("#mergeNew"),
  mergeRow: $("#mergeRow"),
  existing: $("#existing"),
  setting: $("#setting"),
  extra: $("#extra"),
  chips: $("#chips"),
  generate: $("#generate"),
  resetAuto: $("#resetAuto"),
  selA: $("#selA"),
  selB: $("#selB"),
  selC: $("#selC"),
  selD: $("#selD"),
  selE: $("#selE"),
  downloadDoc: $("#downloadDoc"),
  downloadHtml: $("#downloadHtml"),
  copy: $("#copy"),
  print: $("#print"),
  clear: $("#clear"),
  status: $("#status"),
  picked: $("#picked"),
  outSub: $("#outSub"),
  output: $("#output"),
  modelBadge: $("#modelBadge"),
  apiKeyBtn: $("#apiKeyBtn"),
  apiKeyModal: $("#apiKeyModal"),
  apiKeyInput: $("#apiKeyInput"),
  apiKeySave: $("#apiKeySave"),
  apiKeyCancel: $("#apiKeyCancel"),
  apiKeyStatus: $("#apiKeyStatus"),
  apiKeyHint: $("#apiKeyHint"),
  apiKeyTitle: $("#apiKeyTitle"),
};

let rawWorksheet = "";
(function loadStoredApiKey() {
  try {
    const stored = (localStorage.getItem("deepseek_api_key") || "").trim();
    if (stored && window.CONFIG) window.CONFIG.API_KEY = stored;
  } catch (_) {}
})(); 
let generating = false;


function setStatus(msg, kind) {
  els.status.textContent = msg || "";
  els.status.className = "status" + (kind ? " " + kind : "");
}

function setOutSub(msg) {
  if (els.outSub) els.outSub.textContent = msg;
}

// Fill each section dropdown: an "Auto" option plus every exercise, from every
// group, so any section can run any activity.
function populateSelects() {
  SELECT_GROUPS.forEach((g) => {
    const sel = els["sel" + g.key];
    if (!sel) return;
    sel.innerHTML = "";

    const auto = document.createElement("option");
    auto.value = "auto";
    auto.textContent = g.autoLabel;
    sel.appendChild(auto);

    EXERCISE_BANKS.forEach((bank) => {
      const meta = sectionMeta(String(bank.section));
      if (!meta) return;
      const group = document.createElement("optgroup");
      group.label = bank.label;
      Object.keys(meta).forEach((p) => {
        if (bank.exclude.indexOf(p) >= 0) return;
        const opt = document.createElement("option");
        opt.value = choiceValue(bank.section, p);
        opt.textContent = meta[p].title;
        group.appendChild(opt);
      });
      sel.appendChild(group);
    });
  });
}

function buildSelection() {
  const sel = {};
  SELECT_GROUPS.forEach((g) => {
    const el = els["sel" + g.key];
    sel[g.key] = el ? el.value : "auto";
  });
  return sel;
}

function resetToAuto() {
  SELECT_GROUPS.forEach((g) => {
    const el = els["sel" + g.key];
    if (el) el.value = "auto";
  });
}

function updateChips() {
  const studyMode = Boolean(els.studyMode && els.studyMode.checked);
  const mergeNew = Boolean(els.mergeNew && els.mergeNew.checked) && !studyMode;
  const existing = parseWords(els.existing.value);
  const newWords = studyMode ? [] : currentNewWords();
  const shown = mergeNew ? uniqueWords(existing.concat(newWords)) : existing;
  const newSet = new Set(newWords.map((w) => w.toLowerCase()));

  els.chips.innerHTML = "";
  if (!shown.length) {
    const c = document.createElement("span");
    c.className = "chip empty";
    c.textContent = "no words yet";
    els.chips.appendChild(c);
    return;
  }
  shown.forEach((w) => {
    const c = document.createElement("span");
    const isNew = mergeNew && newSet.has(w.toLowerCase());
    c.className = "chip" + (isNew ? " new-word" : "");
    c.textContent = w;
    els.chips.appendChild(c);
  });
}

function currentNewWords() {
  return [els.new1.value, els.new2.value, els.new3.value]
    .map((s) => s.trim())
    .filter(Boolean);
}

// Study mode: no new words at all, so the new-word boxes and the merge toggle rest.
function applyMode() {
  const studyMode = Boolean(els.studyMode && els.studyMode.checked);
  [els.new1, els.new2, els.new3].forEach((el) => {
    el.disabled = studyMode;
  });
  els.newWordGrid.classList.toggle("is-disabled", studyMode);
  els.mergeNew.disabled = studyMode;
  els.mergeRow.classList.toggle("is-disabled", studyMode);
  els.newWordsHint.textContent = studyMode
    ? "Study mode is on: the worksheet reviews the words below and adds no new words."
    : "Add 1 to 3 brand-new words for this lesson - one or two is fine.";
  updateChips();
}

function hasApiKey() {
  const key = (window.CONFIG && window.CONFIG.API_KEY || "").trim();
  return Boolean(key) && key !== "YOUR_API_KEY_HERE";
}

function refreshApiKeyButton() {
  if (!els.apiKeyBtn) return;
  const saved = hasApiKey();
  els.apiKeyBtn.textContent = saved ? "Change API key" : "Add API key";
  els.apiKeyBtn.classList.toggle("has-key", saved);
}

function setApiKeyStatus(msg, kind) {
  if (!els.apiKeyStatus) return;
  els.apiKeyStatus.textContent = msg || "";
  els.apiKeyStatus.className = "status" + (kind ? " " + kind : "");
}

function openApiKeyModal() {
  if (!els.apiKeyModal) return;
  const saved = hasApiKey();
  els.apiKeyTitle.textContent = saved ? "Change DeepSeek API key" : "Add DeepSeek API key";
  els.apiKeyHint.innerHTML = saved
  ? "A key is saved in this browser. Paste a new one to replace it."
  : "Paste your key. It is saved only in this browser (localStorage).";
  els.apiKeyInput.value = "";
  els.apiKeySave.textContent = saved ? "Change key" : "Save key";
  setApiKeyStatus("");
  els.apiKeyModal.hidden = false;
  els.apiKeyInput.focus();
}

function closeApiKeyModal() {
  if (!els.apiKeyModal) return;
  els.apiKeyModal.hidden = true;
  els.apiKeyInput.value = "";
  setApiKeyStatus("");
}
async function saveApiKey() {
  const apiKey = (els.apiKeyInput.value || "").trim();
  if (!apiKey) {
    setApiKeyStatus("Paste a DeepSeek API key first.", "error");
    return;
  }

  els.apiKeySave.disabled = true;
  setApiKeyStatus("Saving to this browser...");

  try {
    localStorage.setItem("deepseek_api_key", apiKey);
    window.CONFIG.API_KEY = apiKey;
    refreshApiKeyButton();
    setApiKeyStatus("Saved in this browser.", "ok");
    setTimeout(closeApiKeyModal, 700);
  } catch (err) {
    setApiKeyStatus("Could not save the key: " + String(err.message || err), "error");
  } finally {
    els.apiKeySave.disabled = false;
  }
}

function activeEndpoints() {
  const list = [window.CONFIG.API_URL];
  if (location.protocol === "http:" || location.protocol === "https:") {
    list.push("/api/chat"); // local proxy from server.js
  }
  return list;
}

async function generate() {
  if (generating) return;

  const key = (window.CONFIG.API_KEY || "").trim();
  if (!key || key === "YOUR_API_KEY_HERE") {
    setStatus("Add your DeepSeek API key first (use the API key button in the header).", "error");
    openApiKeyModal();
    return;
  }

  const studyMode = Boolean(els.studyMode && els.studyMode.checked);
  const mergeNew = Boolean(els.mergeNew && els.mergeNew.checked) && !studyMode;

  const newWords = studyMode ? [] : currentNewWords();
  const existingWords = parseWords(els.existing.value);
  // New words only reach Sections A-E when the "add new words" toggle is on.
  const words = mergeNew ? uniqueWords(existingWords.concat(newWords)) : existingWords;

  if (!studyMode && !newWords.length) {
    setStatus("Add at least one new word (1 to 3 is fine), or switch on Study mode.", "error");
    return;
  }
  if (words.length < 3) {
    setStatus(
      studyMode
        ? "Add at least 3 vocabulary words to review."
        : "Sections A-E need at least 3 words - add more existing words or new words.",
      "error"
    );
    return;
  }

  const setting = els.setting.value.trim();
  const extra = els.extra.value.trim();

  const selection = buildSelection();
  const plan = resolvePlan(selection);

  const repeated = duplicateSections(plan);
  if (repeated) {
    setStatus(
      'Sections ' + repeated[0] + ' and ' + repeated[1] + ' are both set to "' +
        promptTitle(repeated[2]) + '". Pick different activities, or set one to Auto.',
      "error"
    );
    return;
  }

  const { prompt } = buildPrompt({ newWords, words, setting, extra, plan, studyMode, mergeNew });

  els.picked.innerHTML =
    (studyMode ? "<b>Study mode</b> &middot; Sections A-E only<br />" : "") +
    ["A", "B", "C", "D", "E"]
      .filter((k) => plan[k])
      .map((k) => "<b>" + k + "</b> &middot; " + promptTitle(plan[k]))
      .join("&nbsp;&nbsp;|&nbsp;&nbsp;");

  generating = true;
  els.generate.disabled = true;
  els.generate.textContent = "Generating...";
  els.downloadDoc.disabled = true;
  els.downloadHtml.disabled = true;
  els.copy.disabled = true;
  els.print.disabled = true;
  rawWorksheet = "";
  els.output.classList.add("streaming");
  els.output.textContent = "";
  setOutSub("Generating\u2026");
  setStatus("Contacting DeepSeek...");

  const endpoints = activeEndpoints();
  let received = false;
  let lastError = null;
  let success = false;

  const onToken = (piece) => {
    if (!received) {
      received = true;
      setStatus("Writing the worksheet...");
    }
    rawWorksheet += piece;
    els.output.textContent = rawWorksheet;
    els.output.scrollTop = els.output.scrollHeight;
  };

  for (const endpoint of endpoints) {
    try {
      await streamChat(endpoint, prompt, onToken);
      success = true;
      break;
    } catch (err) {
      lastError = err;
      // If we already received content, don't silently restart on another endpoint.
      if (received) break;
    }
  }

  generating = false;
  els.generate.disabled = false;
  els.generate.textContent = "Generate Worksheet";

  if (success && rawWorksheet.trim()) {
    renderPreview();
    els.downloadDoc.disabled = false;
    els.downloadHtml.disabled = false;
    els.copy.disabled = false;
    els.print.disabled = false;
    setOutSub("Ready \u00b7 download, copy or print");
    setStatus("Done. Download the file, or Copy to paste into Google Docs.", "ok");
  } else {
    setOutSub("Generation failed");
    const msg = lastError ? String(lastError.message || lastError) : "No response from the model.";
    setStatus(
      "Failed: " + msg +
      (received ? "" : "  (If this is a CORS/network error, run `node server.js` and open http://localhost:3000)"),
      "error"
    );
  }
}

async function copyWorksheet() {
  if (!rawWorksheet) return;
  const text = cleanText(rawWorksheet);
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(ta);
  }
  const old = els.copy.textContent;
  els.copy.textContent = "Copied!";
  setTimeout(() => { els.copy.textContent = old; }, 1200);
}

function clearAll() {
  if (generating) return;
  rawWorksheet = "";
  els.output.classList.remove("streaming");
  els.output.textContent = "";
  els.downloadDoc.disabled = true;
  els.downloadHtml.disabled = true;
  els.copy.disabled = true;
  els.print.disabled = true;
  setStatus("");
  els.picked.textContent = "";
  setOutSub("Nothing generated yet");
}

els.existing.addEventListener("input", updateChips);
[els.new1, els.new2, els.new3].forEach((el) => el.addEventListener("input", updateChips));
els.mergeNew.addEventListener("change", updateChips);
els.studyMode.addEventListener("change", applyMode);
if (els.apiKeyBtn) els.apiKeyBtn.addEventListener("click", openApiKeyModal);
if (els.apiKeySave) els.apiKeySave.addEventListener("click", saveApiKey);
if (els.apiKeyCancel) els.apiKeyCancel.addEventListener("click", closeApiKeyModal);
if (els.apiKeyModal) {
  els.apiKeyModal.addEventListener("click", (e) => {
    if (e.target === els.apiKeyModal) closeApiKeyModal();
  });
}
if (els.apiKeyInput) {
  els.apiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveApiKey();
    if (e.key === "Escape") closeApiKeyModal();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && els.apiKeyModal && !els.apiKeyModal.hidden) closeApiKeyModal();
});
els.generate.addEventListener("click", generate);
els.resetAuto.addEventListener("click", resetToAuto);
els.downloadDoc.addEventListener("click", () => downloadWorksheet("vocabulary-worksheet.doc", "application/msword"));
els.downloadHtml.addEventListener("click", () => downloadWorksheet("vocabulary-worksheet.html", "text/html"));
els.copy.addEventListener("click", copyWorksheet);
els.print.addEventListener("click", () => window.print());
els.clear.addEventListener("click", clearAll);

populateSelects();
applyMode();
updateChips();
refreshApiKeyButton();
if (els.modelBadge && window.CONFIG) {
  els.modelBadge.textContent = window.CONFIG.MODEL;
}
