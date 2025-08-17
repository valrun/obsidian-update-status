const { Plugin, Notice, PluginSettingTab, App, Setting } = require('obsidian');

module.exports = class UpdateStatusPlugin extends Plugin {
    settings = {
        sourceFile: "",
        targetFile: "",
        allowedSections: [],
        autoOpen: true,
        autoCopy: true
    };

    async onload() {
        await this.loadSettings();
        
        // Main ribbon icon for updating status
        this.addRibbonIcon('copy', 'Update Task Status', async () => {
            await this.updateSummary();
        });

        this.addSettingTab(new UpdateStatusSettingTab(this.app, this));

        this.addCommand({
            id: 'update-status',
            name: 'Update Task Summary',
            callback: () => this.updateSummary()
        });

    }

    async updateSummary() {
        try {
            const { sourceFile, targetFile, allowedSections, autoOpen, autoCopy } = this.settings;
            
            if (!sourceFile) {
                new Notice('❌ Source file not specified');
                return;
            }
            
            if (!targetFile) {
                new Notice('❌ Target file not specified');
                return;
            }
            
            if (!sourceFile.endsWith('.md') || !targetFile.endsWith('.md')) {
                new Notice('❌ File paths must end with .md extension');
                return;
            }
            
            const allowedSectionsSet = new Set(allowedSections);

            const sourceFileObj = this.app.vault.getAbstractFileByPath(sourceFile);
            if (!sourceFileObj) {
                new Notice(`❌ File ${sourceFile} not found`);
                return;
            }

            const content = await this.app.vault.read(sourceFileObj);
            const tasks = this.parseTasks(content, allowedSectionsSet);

            if (tasks.length === 0) {
                new Notice("No tasks found for processing");
                return;
            }

            const newContent = tasks.join('\n');
            let targetFileObj = this.app.vault.getAbstractFileByPath(targetFile);
            
            if (targetFileObj) {
                await this.app.vault.modify(targetFileObj, newContent);
            } else {
                targetFileObj = await this.app.vault.create(targetFile, newContent);
            }

            new Notice(`✅ Updated ${tasks.length} tasks in ${targetFile}`);
            
            if (autoOpen) await this.openStatusFile(targetFile);
            if (autoCopy) {
                await this.copyToClipboard(newContent);
                new Notice('📋 Status copied to clipboard');
            }
            
        } catch (err) {
	    console.error("UpdateStatusPlugin error:", err);
	    new Notice(`❌ Error: ${err.message || "Check console for details"}`);
        }
    }

    async openStatusFile(filePath) {
        try {
            const targetFile = this.app.vault.getAbstractFileByPath(filePath);
            if (!targetFile) {
                new Notice(`❌ Status file ${filePath} not found!`);
                return;
            }
            
            const leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(targetFile);
            
        } catch (err) {
            new Notice('❌ Error opening file');
            console.error(err);
        }
    }
    
    async copyStatusContent() {
        try {
            const targetFile = this.settings.targetFile;
            if (!targetFile) {
                new Notice('❌ Target file not specified!');
                return;
            }
            
            const targetFileObj = this.app.vault.getAbstractFileByPath(targetFile);
            
            if (!targetFileObj) {
                new Notice(`❌ Status file ${targetFile} not found!`);
                return;
            }
            
            const content = await this.app.vault.read(targetFileObj);
            await this.copyToClipboard(content);
            new Notice('📋 Task status copied to clipboard');
        } catch (err) {
            new Notice('❌ Copy error');
            console.error(err);
        }
    }
    
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            return true;
        } catch (err) {
            console.error('Copy error:', err);
            new Notice('❌ Failed to copy to clipboard');
            return false;
        }
    }
    
    parseTasks(content, allowedSections) {
	const taskRegex = new RegExp(
		'^\\s*' +       // Начало строки с пробелами
		'-\\s*' +        // Маркер списка и пробел
		'\\[[ x]\\]' +   // Чекбокс [ ] или [x]
		'.*?' +          // Любые символы (нежадный режим)
		'\\[\\[' +       // Открытие [[
		'(\\d+)' +       // Цифровой ID (группа захвата 1)
		'(?:\\]|\\|)'    // Закрывающая ] или разделитель |
	);
        const tasks = [];
        let currentSection = "";

        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('## ')) {
                currentSection = line.substring(3).trim();
                continue;
            }

            if (allowedSections.size > 0 && !allowedSections.has(currentSection)) continue;
            if (!line.startsWith('- [') && !line.includes('[[')) continue;
            const taskMatch = line.match(taskRegex);
            if (taskMatch && taskMatch[1]) {
                tasks.push(`${taskMatch[1]} - ${currentSection}`);
            }
        }

        return tasks;
    }

    async loadSettings() {
        const loadedSettings = await this.loadData();
        if (loadedSettings) {
            if (typeof loadedSettings.allowedSections === 'string') {
                loadedSettings.allowedSections = loadedSettings.allowedSections
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s);
            }
            
            this.settings = Object.assign({}, this.settings, loadedSettings);
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class UpdateStatusSettingTab extends PluginSettingTab {
    plugin;
    allFiles = [];
    sourceFileSections = [];

    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async loadFiles() {
        this.allFiles = this.app.vault.getFiles().map(f => f.path);
    }

    async loadSourceFileSections() {
        this.sourceFileSections = [];
        const sourceFile = this.plugin.settings.sourceFile;
        
        if (!sourceFile) return;
        
        const file = this.app.vault.getAbstractFileByPath(sourceFile);
        if (!file) return;
        
        try {
            const content = await this.app.vault.cachedRead(file);
            const lines = content.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('## ')) {
                    const section = line.substring(3).trim();
                    if (!this.sourceFileSections.includes(section)) {
                        this.sourceFileSections.push(section);
                    }
                }
            }
        } catch (err) {
            console.error("Error reading file sections:", err);
        }
    }

    async display() {
        await this.loadFiles();
        await this.loadSourceFileSections();
        
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Update Status Plugin Settings' });

        // Section 1: Files
        containerEl.createEl('h3', { text: 'File Configuration' });
        
        // Source file field
        new Setting(containerEl)
            .setName('Source Tasks File')
            .setDesc('Path to file containing tasks')
            .addText(text => {
                text.setPlaceholder('Example: Folder/Tasks.md')
                    .setValue(this.plugin.settings.sourceFile)
                    .onChange(async (value) => {
                        this.plugin.settings.sourceFile = value;
                        await this.plugin.saveSettings();
                        await this.loadSourceFileSections();
                        this.display();
                    });
                
                // Add file selection button
                const selectButton = text.inputEl.createEl('button', {
                    text: 'Select',
                    cls: 'mod-cta'
                });
                selectButton.style.marginLeft = '10px';
                selectButton.onclick = async () => {
                    const file = await this.selectFile();
                    if (file) {
                        this.plugin.settings.sourceFile = file;
                        await this.plugin.saveSettings();
                        await this.loadSourceFileSections();
                        this.display();
                    }
                };
                
                // Add file selection button
                const datalist = document.createElement('datalist');
                datalist.id = 'sourceFilesList';
                this.allFiles.forEach(file => {
                    datalist.appendChild(new Option(file));
                });
                text.inputEl.insertAdjacentElement('afterend', datalist);
                text.inputEl.setAttr('list', 'sourceFilesList');
            });

        // Target file field
        new Setting(containerEl)
            .setName('Target Status File')
            .setDesc('Where to save task summary')
            .addText(text => {
                text.setPlaceholder('Example: Folder/Status.md')
                    .setValue(this.plugin.settings.targetFile)
                    .onChange(async (value) => {
                        this.plugin.settings.targetFile = value;
                        await this.plugin.saveSettings();
                    });
                
                const selectButton = text.inputEl.createEl('button', {
                    text: 'Select',
                    cls: 'mod-cta'
                });
                selectButton.style.marginLeft = '10px';
                selectButton.onclick = async () => {
                    const file = await this.selectFile();
                    if (file) {
                        this.plugin.settings.targetFile = file;
                        await this.plugin.saveSettings();
                        this.display();
                    }
                };
                
                const datalist = document.createElement('datalist');
                datalist.id = 'targetFilesList';
                this.allFiles.forEach(file => {
                    datalist.appendChild(new Option(file));
                });
                text.inputEl.insertAdjacentElement('afterend', datalist);
                text.inputEl.setAttr('list', 'targetFilesList');
            });

        // Section 2: Allowed sections
        containerEl.createEl('h3', { text: 'Task Processing' })
        
        if (this.sourceFileSections.length > 0) {
            const sectionsContainer = containerEl.createDiv('sections-container');
            sectionsContainer.style.display = 'grid';
            sectionsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
            sectionsContainer.style.gap = '10px';
            sectionsContainer.style.marginBottom = '15px';
            
            this.sourceFileSections.forEach(section => {
                const sectionDiv = sectionsContainer.createDiv();
                
                new Setting(sectionDiv)
                    .setName(section)
                    .addToggle(toggle => {
                        toggle.setValue(this.plugin.settings.allowedSections.includes(section))
                        .onChange(async (value) => {
                            if (value) {
                                if (!this.plugin.settings.allowedSections.includes(section)) {
                                    this.plugin.settings.allowedSections.push(section);
                                }
                            } else {
                                this.plugin.settings.allowedSections = 
                                    this.plugin.settings.allowedSections.filter(s => s !== section);
                            }
                            await this.plugin.saveSettings();
                        });
                    });
            });
        } else {
            containerEl.createEl('p', {
                text: '⚠️ Sections not found. Specify source file and click "Refresh"',
                cls: 'setting-item-description'
            });
        }
        
        const buttonsContainer = containerEl.createDiv('buttons-container');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '10px';
        buttonsContainer.style.marginTop = '20px';
        
        new Setting(buttonsContainer)
            .addButton(button => button
                .setButtonText('Refresh Data')
                .setCta()
                .onClick(async () => {
                    await this.loadFiles();
                    await this.loadSourceFileSections();
                    this.display();
                }));

        // Section 3: Automatic Actions
        containerEl.createEl('h3', { text: 'Automatic Actions' });
        
        new Setting(containerEl)
            .setName('Open status file after update')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoOpen)
                .onChange(async (value) => {
                    this.plugin.settings.autoOpen = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Copy status to clipboard after update')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoCopy)
                .onChange(async (value) => {
                    this.plugin.settings.autoCopy = value;
                    await this.plugin.saveSettings();
                }));

        // Control buttons
        const settingButtonsContainer = containerEl.createDiv('buttons-container');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '10px';
        buttonsContainer.style.marginTop = '20px';

        new Setting(settingButtonsContainer)
            .addButton(button => button
                .setButtonText('Reset Settings')
                .onClick(async () => {
                    this.plugin.settings = {
                        sourceFile: "",
                        targetFile: "",
                        allowedSections: this.sourceFileSections.length > 0 
                            ? [...this.sourceFileSections] 
                            : [],
                        autoOpen: true,
                        autoCopy: true
                    };
                    await this.plugin.saveSettings();
                    this.display();
                }));
    }
    
    async selectFile() {
        return new Promise((resolve) => {
            const modal = new FileSelectModal(
                this.app,
                this.allFiles,
                (file) => resolve(file),
                () => resolve(null)
            );
            modal.open();
        });
    }
}

class FileSelectModal {
    constructor(app, files, onSelect, onCancel) {
        this.app = app;
        this.files = files;
        this.onSelect = onSelect;
        this.onCancel = onCancel;
    }

    open() {
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl('h2', { text: 'Select File' });
        
        const searchInput = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'Search files...'
        });
        searchInput.style.width = '100%';
        searchInput.style.marginBottom = '10px';
        
        const fileList = contentEl.createDiv('file-list');
        fileList.style.maxHeight = '300px';
        fileList.style.overflowY = 'auto';

        // Initial file display
        this.renderFiles(this.files, fileList);
        
        // Search handling
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = this.files.filter(file => 
                file.toLowerCase().includes(query)
            );
            this.renderFiles(filtered, fileList);
        });
        
        // Buttons
        const buttons = contentEl.createDiv('buttons-container');
        buttons.style.display = 'flex';
        buttons.style.justifyContent = 'flex-end';
        buttons.style.gap = '10px';
        buttons.style.marginTop = '20px';
        
        const cancelButton = buttons.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.onCancel();
            this.close();
        });
    }
    
    renderFiles(files, container) {
        container.empty();
        
        if (files.length === 0) {
            container.createEl('p', { text: 'No files found' });
            return;
        }
        
        files.forEach(file => {
            const fileItem = container.createDiv('file-item');
            fileItem.style.padding = '5px';
            fileItem.style.cursor = 'pointer';
            fileItem.textContent = file;
            
            fileItem.addEventListener('click', () => {
                this.onSelect(file);
                this.close();
            });
        });
    }
    
    close() {
        this.contentEl.empty();
        this.contentEl.detach();
    }
}
