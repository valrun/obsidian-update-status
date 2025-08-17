# Obsidian Update Status Plugin for Obsidian Kanban

This plugin helps you maintain an up-to-date task status summary for your Obsidian Kanban boards.

## Features

- 🔄 Sync task IDs between source and target files
- 🗂️ Filter tasks by section headers
- 📋 Automatic clipboard copying
- 🚪 Auto-open status file after update
- ⚙️ Intuitive settings interface

## Installation

1. Go to **Settings → Community plugins**
2. Click **Browse** and search for "Obsidian Update Status"
3. Click **Install**
4. Enable the plugin

## Basic Usage

1. Add the plugin to your Kanban board notes:
   ```markdown
   ```kanban
   columns: Todo, Doing, Done
   ## Todo
   - [ ] Design homepage [[123]]
   - [ ] Create logo [[456]]
   
   ## Doing
   - [x] Write content [[789]]
   ```
   
2. Run the plugin command:
   - Click the ribbon icon 📋
   - Or use command palette: "Update Task Summary"

3. Get formatted output:
   ```
   123 - Todo
   456 - Todo
   789 - Doing
   ```

## Configuration

### 1. Set source and target files

### 2. Select allowed sections

### 3. Configure automatic actions

## Advanced Examples

### Filter specific sections
```markdown
## Backlog
- [ ] Research [[101]]

## Active
- [x] Development [[202]]
- [ ] Testing [[303]]

## Completed
- [x] Deployment [[404]]
```

With "Active" section selected → Output:
```
202 - Active
303 - Active
```

### Complex task formats
```markdown
## Documentation
- [x] Write API docs [[505|api-reference]] 
  - [ ] Add examples [[606]]
- [x] Update README [[707]] (urgent)
```

Output:
```
505 - Documentation
606 - Documentation
707 - Documentation
```

### Multiple projects
```markdown
# Project Alpha
## Design
- [ ] Mockups [[111]]

# Project Beta
## Development
- [x] Backend [[222]]
```

Output (with both sections):
```
111 - Design
222 - Development
```

## Troubleshooting

**Error: "No tasks found"**
- Verify tasks use format: `- [ ] Task [[123]]`
- Check allowed sections in settings

**Error: "File not found"**
- Confirm correct file paths
- Check for typos in .md extension

**Task IDs not captured**
- Ensure IDs are numeric: [[123]] not [[ABC]]
- Check for spaces between brackets

---

**Tip**: Use this plugin with [Obsidian Kanban](https://github.com/mgmeyers/obsidian-kanban) for seamless task management!
