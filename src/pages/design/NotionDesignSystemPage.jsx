import './NotionDesignSystemPage.css'

const palette = [
  ['Notion Black', 'rgba(0,0,0,0.95)', 'Primary text'],
  ['Pure White', '#ffffff', 'Page background'],
  ['Notion Blue', '#0075de', 'Primary CTA'],
  ['Warm White', '#f6f5f4', 'Alt surface'],
  ['Warm Gray 500', '#615d59', 'Secondary text'],
  ['Warm Gray 300', '#a39e98', 'Muted labels'],
]

const typeRows = [
  ['Display Hero', '64px', '700', '1.0', '-2.125px'],
  ['Section Heading', '48px', '700', '1.0', '-1.5px'],
  ['Sub-heading', '26px', '700', '1.23', '-0.625px'],
  ['Card Title', '22px', '700', '1.27', '-0.25px'],
  ['Body', '16px', '400', '1.50', '0'],
  ['Badge', '12px', '600', '1.33', '0.125px'],
]

function Section({ eyebrow, title, description, children, warm = false, id }) {
  return (
    <section className={`nds-section${warm ? ' warm' : ''}`} id={id}>
      <div className="nds-section-head">
        <div>
          <div className="nds-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>
      {children}
    </section>
  )
}

function Pill({ children, blue = false }) {
  return <span className={`nds-pill${blue ? ' blue' : ''}`}>{children}</span>
}

function Card({ children, className = '' }) {
  return <div className={`nds-card ${className}`}>{children}</div>
}

export default function NotionDesignSystemPage() {
  return (
    <div className="nds-page">
      <header className="nds-nav">
        <div className="nds-nav-inner">
          <div className="nds-brand">
            <div className="nds-logo">N</div>
            <div>
              <div className="nds-brand-title">Notion-inspired Design System</div>
              <div className="nds-brand-sub">Warm, quiet, and editorial</div>
            </div>
          </div>
          <nav className="nds-nav-links">
            <a href="#theme">Theme</a>
            <a href="#palette">Palette</a>
            <a href="#type">Typography</a>
            <a href="#components">Components</a>
            <a href="#prompt">Prompt Guide</a>
          </nav>
          <a className="nds-nav-cta" href="#components">Explore</a>
        </div>
      </header>

      <main className="nds-shell">
        <section className="nds-hero" id="theme">
          <div className="nds-hero-copy">
            <div className="nds-kicker">
              <Pill blue>Warm neutrals</Pill>
              <Pill>NotionInter</Pill>
              <Pill>Whisper borders</Pill>
            </div>
            <h1>
              Blank canvas.
              <span>Warm, precise, quietly premium.</span>
            </h1>
            <p className="nds-lead">
              A Notion-inspired system built on paper-white surfaces, near-black text,
              ultra-thin borders, and a single blue accent for the moments that matter.
            </p>
            <div className="nds-actions">
              <a href="#components" className="nds-btn primary">View components</a>
              <a href="#prompt" className="nds-btn soft">Prompt guide</a>
              <a href="#type" className="nds-btn ghost">Typography</a>
            </div>
            <div className="nds-metrics">
              <Card>
                <div className="nds-metric-num">1px</div>
                <div className="nds-metric-label">Whisper border</div>
              </Card>
              <Card>
                <div className="nds-metric-num">64px</div>
                <div className="nds-metric-label">Display compression</div>
              </Card>
              <Card>
                <div className="nds-metric-num">#0075de</div>
                <div className="nds-metric-label">Single accent blue</div>
              </Card>
            </div>
          </div>

          <Card className="nds-hero-panel">
            <div className="nds-workspace-top">
              <div>
                <div className="nds-workspace-title">Workspace preview</div>
                <div className="nds-workspace-sub">Soft density, no chrome noise.</div>
              </div>
              <Pill blue>Live UI</Pill>
            </div>
            <div className="nds-workspace-grid">
              <div className="nds-mini">
                <div className="nds-mini-label">Card shadow</div>
                <div className="nds-mini-value">0.04 max</div>
                <div className="nds-mini-note">four-layer stack</div>
              </div>
              <div className="nds-mini">
                <div className="nds-mini-label">Body text</div>
                <div className="nds-mini-value">16 / 1.5</div>
                <div className="nds-mini-note">warm, readable</div>
              </div>
              <div className="nds-visual">
                <div className="nds-visual-bars">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="nds-visual-canvas">
                  <div className="nds-visual-card big" />
                  <div className="nds-visual-card small" />
                  <div className="nds-visual-card small alt" />
                </div>
              </div>
              <div className="nds-quote">
                <div className="nds-quote-title">Design philosophy</div>
                <p>
                  Let the page breathe. Keep the accent rare. Make depth feel like paper,
                  not glass.
                </p>
              </div>
            </div>
          </Card>
        </section>

        <Section
          id="palette"
          warm
          eyebrow="01 / Color palette"
          title="Warm neutrals with one blue accent."
          description="The palette avoids cold blue-grays and keeps every surface feeling like quality paper."
        >
          <div className="nds-grid swatches">
            {palette.map(([name, value, note]) => (
              <Card key={name} className="nds-swatch">
                <div className="nds-swatch-fill" style={{ background: name === 'Pure White' ? '#fff' : name === 'Warm White' ? '#f6f5f4' : value }} />
                <div className="nds-swatch-body">
                  <div className="nds-swatch-name">{name}</div>
                  <div className="nds-swatch-value">{value}</div>
                  <div className="nds-swatch-note">{note}</div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          id="type"
          eyebrow="02 / Typography"
          title="Compressed display, relaxed body."
          description="NotionInter style compression at headline sizes, with generous reading comfort at body sizes."
        >
          <Card className="nds-type-card">
            <div className="nds-type-head">
              <span>Role</span>
              <span>Size</span>
              <span>Weight</span>
              <span>LH</span>
              <span>LS</span>
            </div>
            {typeRows.map(([role, size, weight, lh, ls]) => (
              <div key={role} className="nds-type-row">
                <div>
                  <div className="nds-type-role">{role}</div>
                  <div className="nds-type-sample">OpenType: lnum / locl on display text.</div>
                </div>
                <div className="nds-type-meta">
                  <span>{size}</span>
                  <span>{weight}</span>
                  <span>{lh}</span>
                  <span>{ls}</span>
                </div>
              </div>
            ))}
          </Card>
        </Section>

        <Section
          id="components"
          eyebrow="03 / Components"
          title="Buttons, cards, inputs, badges, and nav."
          description="Everything shares the same whisper border and restrained elevation logic."
        >
          <div className="nds-grid components">
            <Card className="nds-component">
              <div className="nds-card-title">Buttons</div>
              <div className="nds-stack">
                <div className="nds-line">
                  <span>Primary CTA</span>
                  <button className="nds-btn primary">Get started</button>
                </div>
                <div className="nds-line">
                  <span>Secondary</span>
                  <button className="nds-btn soft">Try it</button>
                </div>
                <div className="nds-line">
                  <span>Ghost</span>
                  <button className="nds-btn ghost">Learn more</button>
                </div>
              </div>
            </Card>

            <Card className="nds-component">
              <div className="nds-card-title">Inputs</div>
              <label className="nds-field">
                <span>Project name</span>
                <input className="nds-input" placeholder="Type a calm product name" />
              </label>
              <label className="nds-field">
                <span>Description</span>
                <textarea className="nds-input nds-textarea" placeholder="Keep it concise and warm." />
              </label>
            </Card>

            <Card className="nds-component">
              <div className="nds-card-title">Badges</div>
              <div className="nds-badges">
                <Pill blue>New</Pill>
                <Pill>Beta</Pill>
                <Pill blue>Linked</Pill>
                <Pill>Stable</Pill>
              </div>
            </Card>

            <Card className="nds-component">
              <div className="nds-card-title">Navigation</div>
              <div className="nds-nav-demo">
                <span>Overview</span>
                <span className="active">Design</span>
                <span>Components</span>
                <span>Prompt</span>
              </div>
            </Card>
          </div>
        </Section>

        <Section
          id="prompt"
          warm
          eyebrow="04 / Prompt guide"
          title="AI prompts that preserve the Notion feel."
          description="Use these as a concise specification for generation tools or code agents."
        >
          <div className="nds-grid prompts">
            <Card className="nds-prompt">
              <div className="nds-card-title">Quick Prompt</div>
              <p>Create a Notion-inspired design system page with a pure white background, warm neutrals, whisper borders, blue CTA accents, and a calm premium editorial layout.</p>
            </Card>
            <Card className="nds-prompt">
              <div className="nds-card-title">Hero Prompt</div>
              <p>Design a large compressed hero headline with strong negative letter-spacing, warm near-black text, and a blue pill CTA on white canvas.</p>
            </Card>
            <Card className="nds-prompt">
              <div className="nds-card-title">Card Prompt</div>
              <p>Build a feature card using 12px radius, 1px whisper border, and a four-layer shadow with opacity under 0.05.</p>
            </Card>
          </div>
        </Section>
      </main>
    </div>
  )
}
