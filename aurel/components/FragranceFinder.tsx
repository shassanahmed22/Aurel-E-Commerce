"use client";

import { useState } from "react";
import { recommendCollection, type FinderAnswers } from "@/lib/finder";
import Link from "next/link";

const QUESTIONS: {
  key: keyof FinderAnswers;
  prompt: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "atmosphere",
    prompt: "Which atmosphere calls to you?",
    options: [
      { value: "forest", label: "A quiet forest, filtered light through trees" },
      { value: "coast", label: "A misty shoreline at dusk" },
      { value: "dusk", label: "A mountain at sunset" },
      { value: "garden", label: "A botanical garden in morning light" },
      { value: "desert", label: "A warm desert landscape" },
    ],
  },
  {
    key: "freshness",
    prompt: "Fresh or warm?",
    options: [
      { value: "fresh", label: "Fresh and bright" },
      { value: "warm", label: "Warm and rich" },
    ],
  },
  {
    key: "intensity",
    prompt: "How do you like a fragrance to feel?",
    options: [
      { value: "subtle", label: "Subtle, close to the skin" },
      { value: "bold", label: "Bold, fills the room" },
    ],
  },
  {
    key: "occasion",
    prompt: "Where will you wear it most?",
    options: [
      { value: "everyday", label: "Everyday" },
      { value: "evening", label: "Evening occasions" },
    ],
  },
  {
    key: "season",
    prompt: "What season are you dressing for?",
    options: [
      { value: "warm_weather", label: "Warm weather" },
      { value: "cool_weather", label: "Cool weather" },
    ],
  },
];

export default function FragranceFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<FinderAnswers>>({});

  const question = QUESTIONS[step];
  const isDone = step >= QUESTIONS.length;

  function choose(value: string) {
    if (!question) return;
    const next = { ...answers, [question.key]: value };
    setAnswers(next);
    setStep(step + 1);
  }

  if (isDone) {
    const result = recommendCollection(answers as FinderAnswers);
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="eyebrow mb-3">Your Match</p>
        <h2 className="font-display text-3xl mb-4 capitalize">{result.primarySlug}</h2>
        <p className="text-moss mb-8">{result.explanation}</p>
        <Link href={`/collection/${result.primarySlug}`} className="btn-primary mb-6 inline-flex">
          Explore {result.primarySlug}
        </Link>
        <p className="eyebrow mb-3">You might also like</p>
        <div className="flex justify-center gap-4">
          {result.alternateSlugs.map((slug) => (
            <Link key={slug} href={`/collection/${slug}`} className="underline underline-offset-4 capitalize">
              {slug}
            </Link>
          ))}
        </div>
        <button onClick={() => { setStep(0); setAnswers({}); }} className="block mx-auto mt-10 text-sm underline">
          Start over
        </button>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="max-w-xl mx-auto py-16">
      <p className="eyebrow text-center mb-2">
        Question {step + 1} of {QUESTIONS.length}
      </p>
      <h2 className="font-display text-3xl text-center mb-10">{question.prompt}</h2>
      <div className="space-y-3" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((opt) => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={answers[question.key] === opt.value}
            onClick={() => choose(opt.value)}
            className="w-full text-left px-6 py-4 border border-sand hover:border-ink transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
