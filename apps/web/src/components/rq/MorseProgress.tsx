"use client";

/**
 * Morse Code Progress Bar
 * Translates "You can stop the signal" to Morse code
 * and displays progress as dots and dashes
 */

const MORSE_CODE: Record<string, string> = {
  Y: "-.--",
  O: "---",
  U: "..-",
  C: "-.-.",
  A: ".-",
  N: "-.",
  S: "...",
  T: "-",
  P: ".--.",
  H: "....",
  E: ".",
  G: "--.",
  I: "..",
  L: ".-..",
  " ": "/", // Word separator
};

const PHRASE = "YOU CAN STOP THE SIGNAL";

// Generate Morse code sequence with separators
function generateMorseSequence(): string[] {
  const result: string[] = [];

  for (let i = 0; i < PHRASE.length; i++) {
    const char = PHRASE[i];
    const morse = MORSE_CODE[char];

    if (morse) {
      if (morse === "/") {
        // Word separator (extra space)
        result.push("/");
      } else {
        // Add each dot or dash
        for (const symbol of morse) {
          result.push(symbol);
        }
        // Letter separator (don't add after last letter)
        if (i < PHRASE.length - 1 && PHRASE[i + 1] !== " ") {
          result.push("|");
        }
      }
    }
  }

  return result;
}

const MORSE_SEQUENCE = generateMorseSequence();

type MorseProgressProps = {
  currentStep: number;
  totalSteps: number;
};

export function MorseProgress({ currentStep, totalSteps }: MorseProgressProps) {
  // Calculate progress (0 to 1)
  const progress = currentStep / totalSteps;

  // How many symbols should be "active"
  const activeCount = Math.floor(progress * MORSE_SEQUENCE.length);

  return (
    <div
      className="morse-progress"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Quiz progress: Step ${currentStep} of ${totalSteps}`}
    >
      <div className="morse-sequence" aria-hidden="true">
        {MORSE_SEQUENCE.map((symbol, index) => {
          const isActive = index < activeCount;

          if (symbol === "/") {
            return <span key={index} className="morse-word-separator" />;
          } else if (symbol === "|") {
            return <span key={index} className="morse-letter-separator" />;
          } else if (symbol === ".") {
            return (
              <span
                key={index}
                className={`morse-symbol morse-dot ${isActive ? "active" : ""}`}
              />
            );
          } else {
            return (
              <span
                key={index}
                className={`morse-symbol morse-dash ${isActive ? "active" : ""}`}
              />
            );
          }
        })}
      </div>
      <p className="morse-text">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  );
}
