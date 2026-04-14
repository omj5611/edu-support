import './DesignSystemPage.css'

const colorSwatches = [
  { name: 'Pure White', hex: '#ffffff', desc: 'Main canvas' },
  { name: 'Near Black', hex: '#111111', desc: 'Primary text' },
  { name: 'Primary Blue', hex: '#0066ff', desc: 'Main accent' },
  { name: 'Gray 700', hex: '#4d4d4d', desc: 'Secondary text' },
  { name: 'Gray 400', hex: '#a6a6a6', desc: 'Subtle labels' },
  { name: 'Gray 100', hex: '#f5f5f5', desc: 'Soft surfaces' },
]

const typographyRows = [
  { role: 'Hero Display', size: '96px', weight: '700', lh: '0.95', ls: '-0.02em', sample: 'Precise light UI.' },
  { role: 'Section Display', size: '64px', weight: '700', lh: '1.0', ls: '-0.018em', sample: 'Clean editorial rhythm.' },
  { role: 'Section Heading', size: '48px', weight: '700', lh: '1.1', ls: '-0.015em', sample: 'Product-first storytelling.' },
  { role: 'Feature Heading', size: '28px', weight: '600', lh: '1.2', ls: '-0.01em', sample: 'Focused, dense, readable.' },
  { role: 'Card Title', size: '22px', weight: '600', lh: '1.3', ls: '-0.006em', sample: 'Component-led structure.' },
  { role: 'Body', size: '14px', weight: '400', lh: '1.6', ls: '0', sample: 'Pretendard tuned for clarity.' },
]

const buttonRows = [
  { label: 'Primary CTA', className: 'ds-btn ds-btn-primary', text: 'Create Page' },
  { label: 'Secondary Soft', className: 'ds-btn ds-btn-secondary', text: 'Preview' },
  { label: 'Ghost', className: 'ds-btn ds-btn-ghost', text: 'Learn More' },
]

function Section({ eyebrow, title, description, children, id }) {
  return (
    <section className="ds-section" id={id}>
      <div className="ds-section-head">
        <div>
          <div className="ds-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>
      {children}
    </section>
  )
}

function Pill({ children, tone = 'default' }) {
  return <span className={`ds-pill ${tone}`}>{children}</span>
}

export default function DesignSystemPage() {
  return (
    <div className="ds-page">
      <header className="ds-nav">
        <div className="ds-nav-inner">
          <div className="ds-brand">
            <div className="ds-brand-mark">D</div>
            <div>
              <div className="ds-brand-title">Design System</div>
              <div className="ds-brand-sub">Light, precise, product-focused</div>
            </div>
          </div>
          <nav className="ds-nav-links">
            <a href="#palette">Palette</a>
            <a href="#type">Typography</a>
            <a href="#components">Components</a>
            <a href="#layout">Layout</a>
            <a href="#prompt">Prompt Guide</a>
          </nav>
          <a className="ds-nav-cta" href="#components">View System</a>
        </div>
      </header>

      <main className="ds-shell">
        <section className="ds-hero">
          <div className="ds-hero-copy">
            <div className="ds-kicker">
              <Pill tone="blue">Light mode only</Pill>
              <Pill>Pretendard</Pill>
              <Pill>Blue accent</Pill>
            </div>
            <h1>
              A clean SaaS dashboard
              <span>with Framer-level precision.</span>
            </h1>
            <p className="ds-lead">
              Pure white canvas, subtle borders, soft shadows, and a tight editorial rhythm.
              Built for Korean-friendly product experiences without visual noise.
            </p>
            <div className="ds-actions">
              <a href="#components" className="ds-btn ds-btn-primary">Explore Components</a>
              <a href="#prompt" className="ds-btn ds-btn-secondary">AI Prompt Guide</a>
            </div>
            <div className="ds-metrics">
              <div className="ds-metric">
                <div className="ds-metric-val">1200px</div>
                <div className="ds-metric-lbl">Max container</div>
              </div>
              <div className="ds-metric">
                <div className="ds-metric-val">8pt</div>
                <div className="ds-metric-lbl">Spacing scale</div>
              </div>
              <div className="ds-metric">
                <div className="ds-metric-val">0.04</div>
                <div className="ds-metric-lbl">Soft shadow base</div>
              </div>
            </div>
          </div>

          <div className="ds-hero-panel">
            <div className="ds-preview-top">
              <div>
                <div className="ds-preview-title">Executive dashboard</div>
                <div className="ds-preview-sub">Dense, calm, and product-first.</div>
              </div>
              <Pill tone="blue">Live</Pill>
            </div>
            <div className="ds-preview-grid">
              <div className="ds-card ds-card-stat">
                <div className="ds-card-stat-label">Primary CTA</div>
                <div className="ds-card-stat-value">Pill button</div>
                <div className="ds-card-stat-note">#0066ff / white text</div>
              </div>
              <div className="ds-card ds-card-stat">
                <div className="ds-card-stat-label">Surface</div>
                <div className="ds-card-stat-value">Card + border</div>
                <div className="ds-card-stat-note">No gradient clutter</div>
              </div>
              <div className="ds-card ds-card-image">
                <div className="ds-image-frame">
                  <div className="ds-image-bars">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="ds-image-graph" />
                </div>
              </div>
              <div className="ds-card ds-card-notice">
                <div className="ds-card-title">Editorial density</div>
                <p>
                  Use deliberate whitespace, compressed headings, and a restrained color
                  story to keep the interface premium.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Section
          id="palette"
          eyebrow="01 / Color palette"
          title="Pure white first, blue only for interaction."
          description="A reduced palette keeps the interface calm. White and neutral grays carry the weight; blue exists only to guide action."
        >
          <div className="ds-grid ds-grid-swatches">
            {colorSwatches.map((item) => (
              <div key={item.name} className="ds-card ds-swatch">
                <div className="ds-swatch-fill" style={{ background: item.hex }} />
                <div className="ds-swatch-body">
                  <div className="ds-swatch-name">{item.name}</div>
                  <div className="ds-swatch-hex">{item.hex}</div>
                  <div className="ds-swatch-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="type"
          eyebrow="02 / Typography"
          title="Pretendard carries every role."
          description="Tight negative letter-spacing keeps the system crisp, but the body stays relaxed and readable."
        >
          <div className="ds-card ds-type-card">
            <div className="ds-type-head">
              <div className="ds-type-labels">
                <span>Role</span>
                <span>Size</span>
                <span>Weight</span>
                <span>LH</span>
                <span>LS</span>
              </div>
            </div>
            <div className="ds-type-list">
              {typographyRows.map((row) => (
                <div key={row.role} className="ds-type-row">
                  <div className="ds-type-meta">
                    <div className="ds-type-role">{row.role}</div>
                    <div className="ds-type-sample">{row.sample}</div>
                  </div>
                  <div className="ds-type-pills">
                    <span>{row.size}</span>
                    <span>{row.weight}</span>
                    <span>{row.lh}</span>
                    <span>{row.ls}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="components"
          eyebrow="03 / Components"
          title="Buttons, cards, inputs, and nav all share one language."
          description="Soft borders, rounded geometry, and tiny elevation differences create depth without visual drama."
        >
          <div className="ds-grid ds-grid-components">
            <div className="ds-card ds-component-card">
              <div className="ds-card-title">Buttons</div>
              <div className="ds-stack">
                {buttonRows.map((button) => (
                  <div key={button.label} className="ds-button-row">
                    <div className="ds-button-label">{button.label}</div>
                    <button className={button.className}>{button.text}</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="ds-card ds-component-card">
              <div className="ds-card-title">Inputs</div>
              <label className="ds-field">
                <span className="ds-field-label">Project name</span>
                <input className="ds-input" placeholder="Type a clean product name" />
              </label>
              <label className="ds-field">
                <span className="ds-field-label">Description</span>
                <textarea className="ds-input ds-textarea" placeholder="Keep it short and precise" />
              </label>
            </div>

            <div className="ds-card ds-component-card">
              <div className="ds-card-title">Cards</div>
              <div className="ds-mini-card">
                <div>
                  <div className="ds-mini-title">Subtle card</div>
                  <div className="ds-mini-copy">Border, radius, and minimal shadow.</div>
                </div>
                <Pill tone="blue">Floating</Pill>
              </div>
              <div className="ds-mini-card muted">
                <div>
                  <div className="ds-mini-title">Soft surface</div>
                  <div className="ds-mini-copy">Great for grouped secondary content.</div>
                </div>
                <Pill>Neutral</Pill>
              </div>
            </div>

            <div className="ds-card ds-component-card">
              <div className="ds-card-title">Navigation</div>
              <div className="ds-nav-demo">
                <span>Overview</span>
                <span>Components</span>
                <span className="active">Layout</span>
                <span>Prompt</span>
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="layout"
          eyebrow="04 / Layout"
          title="Two-column on desktop, single-column on mobile."
          description="Whitespace is part of the system. Each block should breathe, but never drift away from the content."
        >
          <div className="ds-grid ds-grid-layout">
            <div className="ds-card ds-layout-card">
              <div className="ds-card-title">Container</div>
              <p>Max-width 1200px, centered, with scaled spacing steps: 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 / 80.</p>
            </div>
            <div className="ds-card ds-layout-card">
              <div className="ds-card-title">Elevation</div>
              <p>Use shadow and border for depth. Avoid heavy glow and avoid stacked gradients.</p>
            </div>
            <div className="ds-card ds-layout-card full">
              <div className="ds-card-title">Responsive rules</div>
              <div className="ds-rule-list">
                <div><span>Mobile</span><strong>&lt; 768px</strong></div>
                <div><span>Tablet</span><strong>768~1199px</strong></div>
                <div><span>Desktop</span><strong>1200px+</strong></div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="prompt"
          eyebrow="05 / Prompt guide"
          title="Ready-made prompts for AI generation."
          description="These prompts translate the system into direct instructions for design tools or agents."
        >
          <div className="ds-grid ds-grid-prompts">
            <div className="ds-card ds-prompt-card">
              <div className="ds-prompt-title">Quick Prompt</div>
              <p>Create a clean SaaS dashboard using pure white background (#ffffff), Pretendard font, blue accent (#0066ff), pill buttons, and soft shadow cards.</p>
            </div>
            <div className="ds-card ds-prompt-card">
              <div className="ds-prompt-title">Hero Section</div>
              <p>Design a hero section with a 96px Pretendard bold heading, slight negative letter-spacing, and a blue pill CTA button.</p>
            </div>
            <div className="ds-card ds-prompt-card">
              <div className="ds-prompt-title">Navigation</div>
              <p>Build a navigation bar with white translucent background, subtle blur, and minimal UI.</p>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}
