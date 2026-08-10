'use client'

import { Panel, Text } from '@msqdx/ui'
import {
  ASSISTANT_CAPABILITIES_EXAMPLES,
  ASSISTANT_CAPABILITIES_FOOTER,
  ASSISTANT_CAPABILITIES_INTRO,
  ASSISTANT_CAPABILITIES_SECTIONS,
  ASSISTANT_CAPABILITIES_TITLE,
} from '@/lib/assistant/capabilities-overview'

export function AssistantCapabilitiesOverview() {
  return (
    <div className="plexon-assistant-capabilities">
      <header className="plexon-assistant-capabilities-intro">
        <Text role="title" as="h3">
          {ASSISTANT_CAPABILITIES_TITLE}
        </Text>
        <Text role="body" as="p">
          {ASSISTANT_CAPABILITIES_INTRO}
        </Text>
      </header>

      {ASSISTANT_CAPABILITIES_SECTIONS.map((section) => (
        <section key={section.id} className="plexon-assistant-capabilities-section">
          <Text role="title" as="h4" className="plexon-assistant-capabilities-section-title">
            {section.title}
          </Text>

          {section.rows && section.rows.length > 0 ? (
            <div className="plexon-assistant-capabilities-table-wrap">
              <table className="plexon-assistant-capabilities-table">
                <thead>
                  <tr>
                    <th scope="col">Funktion</th>
                    <th scope="col">Beschreibung</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">{row.name}</th>
                      <td>{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {section.bullets ? (
            <ul className="plexon-assistant-capabilities-bullets">
              {section.bullets.map((item) => (
                <li key={item}>
                  <Text role="body" as="span">
                    {item}
                  </Text>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <section className="plexon-assistant-capabilities-examples">
        <Text role="title" as="h4">
          Beispiele
        </Text>
        <ul className="plexon-assistant-capabilities-example-list">
          {ASSISTANT_CAPABILITIES_EXAMPLES.map((example) => (
            <li key={example}>
              <Panel variant="flush" className="plexon-assistant-capabilities-example">
                <Text role="body" as="p">
                  „{example}"
                </Text>
              </Panel>
            </li>
          ))}
        </ul>
      </section>

      <Text role="body" as="p" className="plexon-assistant-capabilities-footer">
        {ASSISTANT_CAPABILITIES_FOOTER}
      </Text>
    </div>
  )
}
