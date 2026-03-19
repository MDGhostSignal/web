"use client";

import { useState } from "react";
import styles from "./design-system.module.css";

// Token data extracted from generated-tokens.css
const semanticColors = [
  { name: "background", var: "--gs-background", light: "#FFFFFF", dark: "#0A0A0A" },
  { name: "foreground", var: "--gs-foreground", light: "#0A0A0A", dark: "#FAFAFA" },
  { name: "primary", var: "--gs-primary", light: "#171717", dark: "#E5E5E5" },
  { name: "primary-foreground", var: "--gs-primary-foreground", light: "#FAFAFA", dark: "#171717" },
  { name: "secondary", var: "--gs-secondary", light: "#F5F5F5", dark: "#262626" },
  { name: "secondary-foreground", var: "--gs-secondary-foreground", light: "#0A0A0A", dark: "#FAFAFA" },
  { name: "muted", var: "--gs-muted", light: "#F5F5F5", dark: "#262626" },
  { name: "muted-foreground", var: "--gs-muted-foreground", light: "#737373", dark: "#A3A3A3" },
  { name: "accent", var: "--gs-accent", light: "#F5F5F5", dark: "#262626" },
  { name: "accent-foreground", var: "--gs-accent-foreground", light: "#171717", dark: "#FAFAFA" },
  { name: "destructive", var: "--gs-destructive", light: "#DC2626", dark: "#7F1D1D" },
  { name: "border", var: "--gs-border", light: "#E5E5E5", dark: "#262626" },
  { name: "input", var: "--gs-input", light: "#E5E5E5", dark: "#262626" },
  { name: "ring", var: "--gs-ring", light: "#737373", dark: "#D4D4D4" },
];

const brandColors = [
  { name: "brand-red", var: "--gs-tw-brand-red", value: "#D66157" },
  { name: "brand-purple", var: "--gs-tw-brand-purple", value: "#9F71AF" },
  { name: "brand-green", var: "--gs-tw-brand-green", value: "#00B29C" },
  { name: "brand-pink", var: "--gs-tw-brand-pink", value: "#FF7BAD" },
  { name: "brand-orange", var: "--gs-tw-brand-orange", value: "#FBAD25" },
];

const chartColors = [
  { name: "chart-1", var: "--gs-chart-1", value: "#5EB1EF" },
  { name: "chart-2", var: "--gs-chart-2", value: "#0090FF" },
  { name: "chart-3", var: "--gs-chart-3", value: "#0588F0" },
  { name: "chart-4", var: "--gs-chart-4", value: "#0D74CE" },
  { name: "chart-5", var: "--gs-chart-5", value: "#113264" },
];

const neutralPalette = [
  { name: "neutral-50", var: "--gs-tw-neutral-50", value: "#FAFAFA" },
  { name: "neutral-100", var: "--gs-tw-neutral-100", value: "#F5F5F5" },
  { name: "neutral-200", var: "--gs-tw-neutral-200", value: "#E5E5E5" },
  { name: "neutral-300", var: "--gs-tw-neutral-300", value: "#D4D4D4" },
  { name: "neutral-400", var: "--gs-tw-neutral-400", value: "#A3A3A3" },
  { name: "neutral-500", var: "--gs-tw-neutral-500", value: "#737373" },
  { name: "neutral-600", var: "--gs-tw-neutral-600", value: "#525252" },
  { name: "neutral-700", var: "--gs-tw-neutral-700", value: "#404040" },
  { name: "neutral-800", var: "--gs-tw-neutral-800", value: "#262626" },
  { name: "neutral-900", var: "--gs-tw-neutral-900", value: "#171717" },
  { name: "neutral-950", var: "--gs-tw-neutral-950", value: "#0A0A0A" },
];

const typographySizes = [
  { name: "xs", size: 12, leading: 16, var: "--gs-font-size-xs" },
  { name: "sm", size: 14, leading: 20, var: "--gs-font-size-sm" },
  { name: "base", size: 16, leading: 24, var: "--gs-font-size-base" },
  { name: "lg", size: 18, leading: 28, var: "--gs-font-size-lg" },
  { name: "xl", size: 20, leading: 28, var: "--gs-font-size-xl" },
  { name: "2xl", size: 24, leading: 32, var: "--gs-font-size-2xl" },
  { name: "3xl", size: 30, leading: 36, var: "--gs-font-size-3xl" },
  { name: "4xl", size: 36, leading: 40, var: "--gs-font-size-4xl" },
  { name: "5xl", size: 48, leading: 48, var: "--gs-font-size-5xl" },
  { name: "6xl", size: 60, leading: 60, var: "--gs-font-size-6xl" },
  { name: "7xl", size: 72, leading: 72, var: "--gs-font-size-7xl" },
  { name: "8xl", size: 96, leading: 96, var: "--gs-font-size-8xl" },
  { name: "9xl", size: 128, leading: 128, var: "--gs-font-size-9xl" },
  { name: "10xl", size: 150, leading: 150, var: "--gs-font-size-10xl" },
];

const fontWeights = [
  { name: "thin", value: 100, var: "--gs-font-weight-thin" },
  { name: "extralight", value: 200, var: "--gs-font-weight-extralight" },
  { name: "light", value: 300, var: "--gs-font-weight-light" },
  { name: "normal", value: 400, var: "--gs-font-weight-normal" },
  { name: "medium", value: 500, var: "--gs-font-weight-medium" },
  { name: "semibold", value: 600, var: "--gs-font-weight-semibold" },
  { name: "bold", value: 700, var: "--gs-font-weight-bold" },
  { name: "extrabold", value: 800, var: "--gs-font-weight-extrabold" },
  { name: "black", value: 900, var: "--gs-font-weight-black" },
];

const spacingScale = [
  { name: "0", value: 0 },
  { name: "1", value: 4 },
  { name: "2", value: 8 },
  { name: "3", value: 12 },
  { name: "4", value: 16 },
  { name: "5", value: 20 },
  { name: "6", value: 24 },
  { name: "8", value: 32 },
  { name: "10", value: 40 },
  { name: "12", value: 48 },
  { name: "16", value: 64 },
  { name: "20", value: 80 },
  { name: "24", value: 96 },
  { name: "32", value: 128 },
  { name: "40", value: 160 },
  { name: "48", value: 192 },
  { name: "64", value: 256 },
];

const radiusScale = [
  { name: "none", value: 0, var: "--gs-radius-none" },
  { name: "xs", value: 2, var: "--gs-radius-xs" },
  { name: "sm", value: 6, var: "--gs-radius-sm" },
  { name: "md", value: 8, var: "--gs-radius-md" },
  { name: "lg", value: 10, var: "--gs-radius-lg" },
  { name: "xl", value: 14, var: "--gs-radius-xl" },
  { name: "2xl", value: 18, var: "--gs-radius-2xl" },
  { name: "3xl", value: 22, var: "--gs-radius-3xl" },
  { name: "4xl", value: 26, var: "--gs-radius-4xl" },
  { name: "full", value: 9999, var: "--gs-radius-full" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button onClick={handleCopy} className={styles.copyBtn} title="Copy to clipboard">
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function ColorSwatch({
  name,
  varName,
  value,
  showDark,
  darkValue,
}: {
  name: string;
  varName: string;
  value: string;
  showDark?: boolean;
  darkValue?: string;
}) {
  const displayValue = showDark && darkValue ? darkValue : value;
  const isLight = parseInt(displayValue.slice(1), 16) > 0x888888;

  return (
    <div className={styles.swatchCard}>
      <div
        className={styles.swatchColor}
        style={{ backgroundColor: displayValue }}
      >
        <span className={styles.swatchHex} style={{ color: isLight ? "#000" : "#fff" }}>
          {displayValue}
        </span>
      </div>
      <div className={styles.swatchInfo}>
        <span className={styles.swatchName}>{name}</span>
        <div className={styles.swatchVar}>
          <code>{varName}</code>
          <CopyButton text={`var(${varName})`} />
        </div>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState("colors");

  const sections = [
    { id: "colors", label: "Colors" },
    { id: "typography", label: "Typography" },
    { id: "spacing", label: "Spacing" },
    { id: "radius", label: "Radius" },
  ];

  return (
    <div className={`${styles.page} ${darkMode ? styles.dark : ""}`}>
      {/* Decorative background */}
      <div className={styles.bgGrid} />
      <div className={styles.bgGradient} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoArea}>
            <div className={styles.logoMark}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
                <circle cx="16" cy="16" r="6" fill="currentColor" />
              </svg>
            </div>
            <div className={styles.logoText}>
              <h1>Design System</h1>
              <span className={styles.version}>GhostSignal v1.0</span>
            </div>
          </div>

          <button
            className={styles.themeToggle}
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {sections.map((section) => (
            <button
              key={section.id}
              className={`${styles.navItem} ${activeSection === section.id ? styles.active : ""}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        {/* Colors Section */}
        {activeSection === "colors" && (
          <div className={styles.section}>
            {/* Semantic Colors */}
            <div className={styles.subsection}>
              <div className={styles.sectionHeader}>
                <h2>Semantic Colors</h2>
                <p>Theme-aware colors that adapt to light and dark modes</p>
              </div>
              <div className={styles.swatchGrid}>
                {semanticColors.map((color) => (
                  <ColorSwatch
                    key={color.name}
                    name={color.name}
                    varName={color.var}
                    value={color.light}
                    showDark={darkMode}
                    darkValue={color.dark}
                  />
                ))}
              </div>
            </div>

            {/* Brand Colors */}
            <div className={styles.subsection}>
              <div className={styles.sectionHeader}>
                <h2>Brand Colors</h2>
                <p>Core brand identity colors</p>
              </div>
              <div className={styles.swatchRow}>
                {brandColors.map((color) => (
                  <ColorSwatch
                    key={color.name}
                    name={color.name}
                    varName={color.var}
                    value={color.value}
                  />
                ))}
              </div>
            </div>

            {/* Chart Colors */}
            <div className={styles.subsection}>
              <div className={styles.sectionHeader}>
                <h2>Chart Colors</h2>
                <p>Sequential palette for data visualization</p>
              </div>
              <div className={styles.chartPalette}>
                {chartColors.map((color) => (
                  <div key={color.name} className={styles.chartColor}>
                    <div
                      className={styles.chartSwatch}
                      style={{ backgroundColor: color.value }}
                    />
                    <span className={styles.chartLabel}>{color.name}</span>
                    <code className={styles.chartHex}>{color.value}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Neutral Palette */}
            <div className={styles.subsection}>
              <div className={styles.sectionHeader}>
                <h2>Neutral Palette</h2>
                <p>Grayscale palette for text, backgrounds, and borders</p>
              </div>
              <div className={styles.paletteStrip}>
                {neutralPalette.map((color) => (
                  <div key={color.name} className={styles.paletteItem}>
                    <div
                      className={styles.paletteColor}
                      style={{ backgroundColor: color.value }}
                    />
                    <div className={styles.paletteInfo}>
                      <span>{color.name.split("-")[1]}</span>
                      <code>{color.value}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Typography Section */}
        {activeSection === "typography" && (
          <div className={styles.section}>
            {/* Type Scale */}
            <div className={styles.subsection}>
              <div className={styles.sectionHeader}>
                <h2>Type Scale</h2>
                <p>Font sizes from xs to 10xl with corresponding line heights</p>
              </div>
              <div className={styles.typeScale}>
                {typographySizes.map((type) => (
                  <div key={type.name} className={styles.typeRow}>
                    <div className={styles.typeMeta}>
                      <span className={styles.typeName}>{type.name}</span>
                      <span className={styles.typeSize}>{type.size}px / {type.leading}px</span>
                      <code className={styles.typeVar}>{type.var}</code>
                      <CopyButton text={`var(${type.var})`} />
                    </div>
                    <div
                      className={styles.typeSample}
                      style={{
                        fontSize: Math.min(type.size, 72),
                        lineHeight: `${Math.min(type.leading, 80)}px`,
                      }}
                    >
                      The quick brown fox
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Font Weights */}
            <div className={styles.subsection}>
              <div className={styles.sectionHeader}>
                <h2>Font Weights</h2>
                <p>Weight variations from thin (100) to black (900)</p>
              </div>
              <div className={styles.weightGrid}>
                {fontWeights.map((weight) => (
                  <div key={weight.name} className={styles.weightCard}>
                    <div
                      className={styles.weightSample}
                      style={{ fontWeight: weight.value }}
                    >
                      Ag
                    </div>
                    <div className={styles.weightInfo}>
                      <span className={styles.weightName}>{weight.name}</span>
                      <span className={styles.weightValue}>{weight.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Spacing Section */}
        {activeSection === "spacing" && (
          <div className={styles.section}>
            <div className={styles.subsection}>
              <div className={styles.sectionHeader}>
                <h2>Spacing Scale</h2>
                <p>Consistent spacing values for margins, padding, and gaps</p>
              </div>
              <div className={styles.spacingTable}>
                <div className={styles.spacingHeader}>
                  <span>Name</span>
                  <span>Value</span>
                  <span>Visual</span>
                </div>
                {spacingScale.map((space) => (
                  <div key={space.name} className={styles.spacingRow}>
                    <span className={styles.spacingName}>space-{space.name}</span>
                    <span className={styles.spacingValue}>{space.value}px</span>
                    <div className={styles.spacingVisual}>
                      <div
                        className={styles.spacingBar}
                        style={{ width: Math.min(space.value, 256) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Radius Section */}
        {activeSection === "radius" && (
          <div className={styles.section}>
            <div className={styles.subsection}>
              <div className={styles.sectionHeader}>
                <h2>Border Radius</h2>
                <p>Corner radius tokens for consistent rounded corners</p>
              </div>
              <div className={styles.radiusGrid}>
                {radiusScale.map((radius) => (
                  <div key={radius.name} className={styles.radiusCard}>
                    <div
                      className={styles.radiusBox}
                      style={{
                        borderRadius: radius.value === 9999 ? "50%" : radius.value,
                      }}
                    />
                    <div className={styles.radiusInfo}>
                      <span className={styles.radiusName}>{radius.name}</span>
                      <code className={styles.radiusValue}>
                        {radius.value === 9999 ? "9999px" : `${radius.value}px`}
                      </code>
                      <CopyButton text={`var(${radius.var})`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span>GhostSignal Design System</span>
          <span className={styles.footerDivider}>|</span>
          <span>Auto-generated from Figma tokens</span>
        </div>
      </footer>
    </div>
  );
}
