'use client'

type Props = {
  answer: string
}

/** Lightweight assistant turn renderer (plain text + paragraphs). */
export function PersonaChatAnswer({ answer }: Props) {
  const paragraphs = answer.split(/\n{2,}/).filter(Boolean)
  if (!paragraphs.length) return null
  return (
    <div className="chat-answer">
      {paragraphs.map((para, i) => (
        <p key={i} className="chat-text">
          {para.split('\n').map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}
