import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { noteSections, reviewSections } from "./note-sections";

export function Note({ text }) {
  if (!text) return <p className="muted">No note was saved for this run.</p>;
  return (
    <div className="note">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" />
          ),
          h1: ({ node, ...props }) => <h4 {...props} />,
          h2: ({ node, ...props }) => <h4 {...props} />,
          h3: ({ node, ...props }) => <h4 {...props} />,
          table: ({ node, ...props }) => (
            <div className="table-scroll">
              <table {...props} />
            </div>
          ),
          img: ({ alt }) => <span>{alt || "Image reference"}</span>,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}

function Sections({ sections }) {
  return sections.map((section, index) => (
    <details key={`${index}-${section.title}`} className="note-section">
      <summary>
        <span>{section.title}</span>
        <span className="section-expand" aria-hidden="true">
          +
        </span>
      </summary>
      <Note text={section.body} />
    </details>
  ));
}

export default function Notes({ text, kind = "research", race }) {
  if (!text)
    return (
      <p className="muted">
        No {kind === "review" ? "review" : "research note"} saved.
      </p>
    );
  const sections = noteSections(text);
  const groups = kind === "review" ? reviewSections(text, race) : null;
  const wordCount = text.trim().split(/\s+/).length;
  return (
    <section className="structured-notes">
      <div className="notes-header">
        <h3>
          {kind === "review"
            ? "After the race: its review"
            : "Original research"}
        </h3>
        <span>
          {sections.length} sections · {wordCount.toLocaleString()} words
        </span>
      </div>
      {kind === "review" && (
        <p className="notes-context">
          Written after seeing the result. These are the model’s own lessons,
          not proof that its next prediction will improve.
        </p>
      )}
      <div className="note-sections">
        <Sections
          sections={groups?.current.length ? groups.current : sections}
        />
      </div>
      {groups?.current.length > 0 && groups.archive.length > 0 && (
        <details className="full-note">
          <summary>Earlier notes & other saved context</summary>
          <Sections sections={groups.archive} />
        </details>
      )}
      <details className="full-note">
        <summary>Read the complete note</summary>
        <Note text={text} />
      </details>
    </section>
  );
}
