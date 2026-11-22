import { useEffect, useState } from "react";
import "./App.css";

const DEFAULT_FILE = "/txt_files/otazky.txt";

function parseQuestions(text) {
  const lines = text.split(/\r?\n/);
  const optionRegex = /^([A-Ga-g])\.\s*(.*)$/;
  const parsed = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(optionRegex);
    if (match) {
      if (current) {
        const letter = match[1].toUpperCase();
        const rawOpt = match[2];
        const isCorrect = rawOpt.includes("*");
        current.options.push({
          letter,
          text: rawOpt.replace(/\*/g, "").trim(),
          correct: isCorrect,
        });
      }
    } else {
      if (!current) {
        current = { question: line, options: [] };
      } else if (current.options.length > 0) {
        parsed.push(current);
        current = { question: line, options: [] };
      } else {
        current.question += " " + line;
      }
    }
  }

  if (current && current.options.length > 0) {
    parsed.push(current);
  }
  return parsed;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function QuizApp() {
  const [sourceName, setSourceName] = useState(DEFAULT_FILE);
  const [queue, setQueue] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [evaluated, setEvaluated] = useState(false);
  const [isLastCorrect, setIsLastCorrect] = useState(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [error, setError] = useState("");

  const resetQuestionState = () => {
    setSelectedLetters([]);
    setEvaluated(false);
    setIsLastCorrect(null);
  };

  const initQuiz = (text, name) => {
    const parsed = parseQuestions(text);
    if (parsed.length === 0) {
      setError(`V súbore "${name}" sa nenašli žiadne otázky.`);
      return;
    }
    setError("");
    setSourceName(name);
    setAllQuestions(parsed);
    setQueue(shuffle(parsed));
    resetQuestionState();
    setStats({ correct: 0, wrong: 0 });
  };

  useEffect(() => {
    fetch(DEFAULT_FILE)
      .then((res) => {
        if (!res.ok) throw new Error(`Nepodarilo sa načítať ${DEFAULT_FILE}`);
        return res.text();
      })
      .then((text) => initQuiz(text, DEFAULT_FILE))
      .catch((err) => setError(err.message));
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => initQuiz(ev.target.result, file.name);
    reader.readAsText(file, "UTF-8");
  };

  const currentQ = queue[0];
  const correctLetters = currentQ
    ? currentQ.options.filter((o) => o.correct).map((o) => o.letter)
    : [];
  const isMulti = correctLetters.length > 1;

  const handleOptionClick = (letter) => {
    if (evaluated || !currentQ) return;

    if (!isMulti) {
      const ok = correctLetters.includes(letter);
      setSelectedLetters([letter]);
      setEvaluated(true);
      setIsLastCorrect(ok);
      setStats((s) => ({
        correct: s.correct + (ok ? 1 : 0),
        wrong: s.wrong + (ok ? 0 : 1),
      }));
    } else {
      setSelectedLetters((prev) =>
        prev.includes(letter)
          ? prev.filter((item) => item !== letter)
          : [...prev, letter]
      );
    }
  };

  const handleEvaluateMulti = () => {
    if (evaluated || !currentQ || selectedLetters.length === 0) return;

    const ok =
      selectedLetters.length === correctLetters.length &&
      correctLetters.every((l) => selectedLetters.includes(l));

    setEvaluated(true);
    setIsLastCorrect(ok);
    setStats((s) => ({
      correct: s.correct + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
    }));
  };

  const handleNext = () => {
    if (!currentQ) return;
    const rest = queue.slice(1);
    if (!isLastCorrect) {
      const insertAt = Math.floor(Math.random() * (rest.length + 1));
      rest.splice(insertAt, 0, currentQ);
    }
    setQueue(rest);
    resetQuestionState();
  };

  const handleRestart = () => {
    setQueue(shuffle(allQuestions));
    resetQuestionState();
    setStats({ correct: 0, wrong: 0 });
  };

  const getOptionClass = (opt, isSelected) => {
    if (!evaluated) {
      return isMulti && isSelected ? "option-btn selected" : "option-btn";
    }
    if (opt.correct) return "option-btn correct";
    if (isSelected) return "option-btn wrong";
    return "option-btn";
  };

  return (
    <div className="quiz-wrapper">
      <header className="quiz-header">
        <h2 className="quiz-title">Testovací kvíz ({sourceName})</h2>
        <label className="upload-btn">
          Nahrať .txt súbor
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="file-input"
          />
        </label>
      </header>

      {error && <p className="quiz-error">{error}</p>}

      <div className="quiz-stats">
        <span>
          Zostáva: <strong className="stat-remaining">{queue.length}</strong> /{" "}
          {allQuestions.length}
        </span>
        <span className="stat-correct">
          Správne: <strong>{stats.correct}</strong>
        </span>
        <span className="stat-wrong">
          Zle: <strong>{stats.wrong}</strong>
        </span>
      </div>

      {currentQ ? (
        <div className="quiz-card">
          {isMulti && (
            <div className="badge-row">
              <span className="multi-badge">Viac správnych odpovedí</span>
            </div>
          )}

          <h3 className="quiz-question">{currentQ.question}</h3>

          <div className="options-list">
            {currentQ.options.map((opt) => {
              const isSelected = selectedLetters.includes(opt.letter);

              return (
                <button
                  key={opt.letter}
                  onClick={() => handleOptionClick(opt.letter)}
                  disabled={evaluated}
                  className={getOptionClass(opt, isSelected)}
                >
                  <span className="option-content">
                    {isMulti && (
                      <span className="option-check">
                        {isSelected ? "[✓]" : "[ ]"}
                      </span>
                    )}
                    <strong>{opt.letter}.</strong> {opt.text}
                  </span>

                  {evaluated && isMulti && opt.correct && !isSelected && (
                    <span className="missed-tag">(neoznačená správna)</span>
                  )}
                </button>
              );
            })}
          </div>

          {correctLetters.length === 0 && (
            <p className="warning-text">
              Upozornenie: Táto otázka nemá v .txt súbore označenú správnu
              odpoveď (*).
            </p>
          )}

          {isMulti && !evaluated && (
            <button
              onClick={handleEvaluateMulti}
              disabled={selectedLetters.length === 0}
              className="btn-evaluate"
            >
              Vyhodnotiť
            </button>
          )}

          {evaluated && (
            <div className="eval-footer">
              <span
                className={
                  isLastCorrect ? "eval-status correct" : "eval-status wrong"
                }
              >
                {isLastCorrect
                  ? "✓ Správne!"
                  : "✗ Nesprávne (otázka sa zopakuje)"}
              </span>

              <button onClick={handleNext} className="btn-next">
                Ďalšia otázka →
              </button>
            </div>
          )}
        </div>
      ) : (
        allQuestions.length > 0 && (
          <div className="finish-card">
            <h3>Hotovo! Všetky otázky máš správne.</h3>
            <p>
              Správnych pokusov: {stats.correct} | Chybných pokusov:{" "}
              {stats.wrong}
            </p>
            <button onClick={handleRestart} className="btn-restart">
              Spustiť znova
            </button>
          </div>
        )
      )}
    </div>
  );
}