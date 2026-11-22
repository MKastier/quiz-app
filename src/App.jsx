import { useEffect, useState } from "react";

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
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [error, setError] = useState("");

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
    setSelected(null);
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

  const handleSelect = (letter) => {
    if (selected !== null || !currentQ) return;
    setSelected(letter);
    const chosen = currentQ.options.find((o) => o.letter === letter);
    if (chosen?.correct) {
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
    }
  };

  const handleNext = () => {
    if (!currentQ) return;
    const chosen = currentQ.options.find((o) => o.letter === selected);
    const rest = queue.slice(1);
    if (!chosen?.correct) {
      const insertAt = Math.floor(Math.random() * (rest.length + 1));
      rest.splice(insertAt, 0, currentQ);
    }
    setQueue(rest);
    setSelected(null);
  };

  const handleRestart = () => {
    setQueue(shuffle(allQuestions));
    setSelected(null);
    setStats({ correct: 0, wrong: 0 });
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Testovací kvíz ({sourceName})</h2>
        <label
          style={{
            padding: "8px 14px",
            background: "#27272a",
            color: "#f4f4f5",
            border: "1px solid #3f3f46",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Nahrať iný .txt súbor
          <input type="file" accept=".txt" onChange={handleFileUpload} style={{ display: "none" }} />
        </label>
      </header>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 14, color: "#a1a1aa" }}>
        <span>Zostáva: <strong style={{ color: "#f4f4f5" }}>{queue.length}</strong> / {allQuestions.length}</span>
        <span style={{ color: "#4ade80" }}>Správne: <strong>{stats.correct}</strong></span>
        <span style={{ color: "#f87171" }}>Zle: <strong>{stats.wrong}</strong></span>
      </div>

      {currentQ ? (
        <div
          style={{
            background: "#18181b",
            color: "#f4f4f5",
            border: "1px solid #3f3f46",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 20, lineHeight: 1.4, color: "#fafafa" }}>
            {currentQ.question}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentQ.options.map((opt) => {
              let bg = "#27272a";
              let border = "#3f3f46";
              let textColor = "#f4f4f5";

              if (selected !== null) {
                if (opt.correct) {
                  bg = "#14532d";
                  border = "#22c55e";
                  textColor = "#f0fdf4";
                } else if (opt.letter === selected) {
                  bg = "#7f1d1d";
                  border = "#ef4444";
                  textColor = "#fef2f2";
                }
              }

              return (
                <button
                  key={opt.letter}
                  onClick={() => handleSelect(opt.letter)}
                  disabled={selected !== null}
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: `2px solid ${border}`,
                    background: bg,
                    color: textColor,
                    cursor: selected === null ? "pointer" : "default",
                    fontSize: 15,
                    opacity: 1,
                  }}
                >
                  <strong>{opt.letter}.</strong> {opt.text}
                </button>
              );
            })}
          </div>

          {!currentQ.options.some((o) => o.correct) && (
            <p style={{ color: "#fbbf24", marginTop: 12, fontSize: 14 }}>
              Upozornenie: Táto otázka nemá v .txt súbore označenú správnu odpoveď (*).
            </p>
          )}

          {selected !== null && (
            <button
              onClick={handleNext}
              style={{
                marginTop: 20,
                padding: "10px 20px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              Ďalšia otázka →
            </button>
          )}
        </div>
      ) : (
        allQuestions.length > 0 && (
          <div
            style={{
              padding: 24,
              background: "#14532d",
              color: "#f0fdf4",
              borderRadius: 12,
              border: "1px solid #22c55e",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Hotovo! Všetky otázky máš správne.</h3>
            <p>Správnych pokusov: {stats.correct} | Chybných pokusov: {stats.wrong}</p>
            <button
              onClick={handleRestart}
              style={{
                padding: "10px 20px",
                background: "#22c55e",
                color: "#052e16",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Spustiť znova
            </button>
          </div>
        )
      )}
    </div>
  );
}