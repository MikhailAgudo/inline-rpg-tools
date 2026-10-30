import { App, Setting, PluginSettingTab } from "obsidian";
import SoloToolkitPlugin from "../main";

export interface SoloToolkitSettings {
  inlineCounters: boolean;
  inlineProgressHighlight: boolean;
}

export const DEFAULT_SETTINGS: SoloToolkitSettings = {
  inlineCounters: true,
  inlineProgressHighlight: true,
};

export class SoloToolkitSettingTab extends PluginSettingTab {
  plugin: SoloToolkitPlugin;

  constructor(app: App, plugin: SoloToolkitPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName("Inline RPG Elements").setHeading();

    new Setting(containerEl)
      .setName("Enable inline elements")
      .setDesc(
        newDesc(
          "Dynamic Counter — `1`, `1/10` (with clickable + and - buttons)",
          "Progress boxes — `boxes: 1/5`, `b:1/5` (clickable boxes)",
          "Progress clock — `clock: 1/6`, `c:1/6` (clickable countdown clock)",
          "Dice roller — any positive number of sides, e.g. `d3`, `d14`, `d100` (clickable dice rolls with advantage/modifiers)",
          "Tab stop — ` ` (alignment spacer)",
        ),
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.inlineCounters)
          .onChange(async (value) => {
            this.plugin.settings.inlineCounters = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Mark every 5th progress box")
      .setDesc("Highlight every 5th box in progress boxes for easier readability")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.inlineProgressHighlight)
          .onChange(async (value) => {
            this.plugin.settings.inlineProgressHighlight = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}

const newDesc = (...lines: string[]) => {
  const el = new DocumentFragment();

  for (const line of lines) {
    const lineEl = document.createElement("div");
    lineEl.innerText = line;
    el.append(lineEl);
  }

  return el;
};
