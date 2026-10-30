import { Plugin } from "obsidian";
import { registerIcons, unregisterIcons } from "./icons";
import {
  SoloToolkitSettingTab,
  SoloToolkitSettings,
  DEFAULT_SETTINGS,
} from "./settings";
import { soloToolkitExtension } from "./inline/live";
import { soloToolkitPostprocessor } from "./inline/read";

export default class SoloToolkitPlugin extends Plugin {
  settings: SoloToolkitSettings;

  async onload() {
    await this.loadSettings();

    registerIcons();

    this.registerMarkdownPostProcessor(soloToolkitPostprocessor(this));
    this.registerEditorExtension(soloToolkitExtension(this));

    this.addSettingTab(new SoloToolkitSettingTab(this.app, this));
  }

  onunload() {
    unregisterIcons();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSetting(setting: Partial<SoloToolkitSettings>) {
    Object.assign(this.settings, setting);
    return this.saveSettings();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
