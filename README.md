# Inline RPG Tools

An Obsidian plugin that brings interactive, clickable inline RPG elements directly into your notes: **Dice Rolls**, **Counters**, **Progress Boxes**, **Clocks**, and **Tab Stops**.

Inline elements are the primary feature and are enabled by default in both Live Preview and Reading views.

Inline RPG Tools is a fork of this wonderful plugin (https://github.com/alexkurowski/solo-toolkit). It removes features not related to inline elements, improves performance and fixes a few issues that Solo RPG Toolkit has.

---

## Features

### 🎲 Dice (Clickable Rolls)
Write dice notation in inline code, and it renders as an interactive dice button you can click to roll directly in your note:

- Dice with any positive number of sides: `` `d3` ``, `` `d4` ``, `` `d14` ``, `` `d100` ``, `` `d534` ``
- Multiple dice: `` `2d6` ``, `` `3d8` ``
- Modifiers: `` `d20+5` ``, `` `2d6-2` ``
- Advantage & Disadvantage:
  - Advantage (roll multiple, take highest): `` `2d20/a` ``
  - Disadvantage (roll multiple, take lowest): `` `2d20/d` ``
- Custom colors: `` `d20,red` ``, `` `d6,#fb464c` ``
- Fudge / Fate dice: `` `4dF` ``
- Left click rolls a new value.
- Right click / long-press opens a menu with additional options (reroll, color selection, advantage toggle, modifiers).

---

### 🔢 Counters (Clickable +/-)
Quick dynamic counters for tracking HP, spell slots, currency, resources, and modifiers:

- Simple counter: `` `5` `` — renders with clickable `−` and `+` buttons.
  - Normal click: ±1
  - Shift-click or Right-click: ±10
- Counter with a maximum limit: `` `3/10` ``
  - Right-click / context menu allows adding/subtracting value or max, resetting to max, draining to 0, or converting into boxes/clocks.

---

### 📦 Progress Boxes (Trackers)
Visual checkable box tracks for tracking damage, harm, conditions, or clocks:

- Boxes tracker: `` `boxes: 1/5` `` or `` `b:1/5` ``
- Circle tracker: `` `circles: 2/6` ``
- Click any box to fill or empty up to that position.
- Right-click context menu lets you reset, clear, adjust maximum, or change colors.
- By default, every 5th box is highlighted for quick readability (can be toggled in settings).

---

### ⏰ Progress Clocks
PbtA / Blades in the Dark style circular segmented countdown clocks:

- Standard clock: `` `clock: 1/6` `` or `` `c:1/6` ``
- Small clock: `` `smclock: 1/4` `` or `` `sc:1/4` ``
- Large clock: `` `lgclock: 0/8` `` or `` `lc:0/8` ``
- Click to advance segments.
- Right-click context menu to change segment count, color, clear, fill, or convert tracker style.

---

### ␣ Tab Stops (Alignment Spacers)
Code blocks with only spaces render as clean blank spaces with fixed tab-stop widths. Ideal for character sheet formatting without creating markdown tables:

```markdown
HP ` ` `12/20`
AC ` ` `16`
```

---

## Settings

- **Enable inline elements**: Toggle inline processing on or off (Enabled by default).
- **Mark every 5th progress box**: Emphasize every fifth box in progress box tracks for quicker scanning (Enabled by default).

---

## Installation

### From Source
1. Clone or copy this repository into your vault's plugins folder: `<vault>/.obsidian/plugins/inline-rpg-tools`
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Enable **Inline RPG Tools** in Obsidian's Community Plugins settings.
