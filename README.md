# Focus Tracker

## Synopsis

Track and align your focus!

![image](https://github.com/jeetsukumaran/obsidian-focus-tracker/assets/26183/4e7343d0-c1ad-49e1-a077-1e0ec48dc135)

Focus Tracker helps you:
- Track effort and attention across multiple projects and activities
- Review past focus patterns to identify gaps and successes
- Plan and direct future attention to align with your goals
- Maintain awareness of project engagement over time

## Overview

### What

Track your past and plan your future focus, attention, efforts, and activities so as to better align with the directions you want to go.

### Why

One may find this useful as a component of their productivity/task-management system to help decide what areas need more attention in the future based on lack of attention or quality of attention in the past, leading to different prioritization of tasks, or as lead indicators in an OKR framework.

I also find this useful as a component of my ADHD self-management system to help align my hyperfocus with my intent, setting time-block targets, etc..

## Quick Start

### Installation

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Focus Tracker"
4. Click Install, then Enable

### Basic Usage

1. Create a focus tracker view in any note:
```yaml
```focustracker
paths: "projects/"
```
```

2. Click cells to cycle through ratings, or right-click for more options
3. Add comments to any entry for context
4. Use flags to mark future intentions or requirements

## Mechanisms: How It Works

### Core Components

#### 1. Tracking Files
Any note can serve as a focus tracking log through:
- Path-based selection: `paths: "projects/"`
- Tag-based selection: `tags: ["research", "active"]`
- Property-based selection: `properties: {"status": "active"}`

#### 2. Rating System
Ratings (positive numbers) show past effort/focus:
```yaml
rating-map: "digitsFilled"  # Choose from: digitsFilled, colors1, moonPhases
```
- ➊-➓: Filled digits (default)
- 🔴🟠🟡🟢🔵: Color progression
- 🌑🌒🌓🌔🌕: Moon phases

#### 3. Flag System
Flags (negative numbers) mark future intentions:
```yaml
flag-map: "academic"  # Choose from: default, academic, project, health, writing
```

Each domain has contextually appropriate flags:
- Academic: 📚(read) ✍️(write) 📝(notes) 🔬(research)
- Project: 💡(idea) 📋(plan) 👥(collab) 📊(review)
- Health: 🏃(exercise) 🥗(nutrition) 😴(sleep) 🧘(mindful)
- Writing: ✍️(draft) 📝(edit) 🔍(research) 📚(reference)

#### 4. Comments
Add context to any entry:
- Right-click → Add Remarks
- Stores in file's YAML frontmatter
- Visible on hover

### Configuration

Global settings (Settings → Focus Tracker):
- Default rating and flag maps
- Minimum/default days shown
- Custom map definitions

Per-tracker settings (in codeblock):
```yaml
```focustracker
paths: "research/"
rating-map: "moonPhases"
flag-map: "academic"
days-past: 14
days-future: 7
```
```

## Policy: How to Use It Effectively

### Two-Mode Operation

#### 1. Review Mode (Ratings)
Use ratings to record past focus and effort:
- Record after work sessions
- Rate quality of attention
- Track time invested
- Note effectiveness

#### 2. Planning Mode (Flags)
Use flags to mark future intentions:
- Set activity targets
- Mark deadlines
- Highlight priorities
- Note dependencies

### Real-World Example: Graduate Student Workflow

#### Research Project Tracker
```yaml
```focustracker
paths: "research/projects"
rating-map: "digitsFilled"
flag-map: "academic"
```
```
- Rate paper-writing sessions (1-10)
- Flag upcoming deadlines 📅
- Mark sections needing focus 📚
- Track experiment progress 🔬

#### Reading List
```yaml
```focustracker
paths: "reading/"
rating-map: "moonPhases"
flag-map: "academic"
```
```
- Rate comprehension of papers
- Flag must-read papers 📚
- Mark papers for discussion ✍️
- Track reading group assignments

#### Health & Wellness
```yaml
```focustracker
paths: "personal/health"
rating-map: "colors1"
flag-map: "health"
```
```
- Track exercise sessions 🏃
- Rate sleep quality 😴
- Plan meal prep 🥗
- Schedule workouts ⏳

#### Teaching Assistant Duties
```yaml
```focustracker
paths: "teaching/"
rating-map: "digitsFilled"
flag-map: "academic"
```
```
- Rate office hours productivity
- Flag grading deadlines 📅
- Track prep time for labs
- Plan review sessions 👥

### Best Practices

1. **Regular Updates**
   - Update ratings daily/weekly
   - Plan flags during weekly review
   - Add comments for context

2. **Focus Analysis**
   - Review patterns monthly
   - Identify neglected areas
   - Adjust priorities based on gaps

3. **Integration**
   - Link to detailed notes
   - Use with daily notes
   - Combine with task management

4. **Progressive Adaptation**
   - Start with one area
   - Add trackers gradually
   - Refine rating criteria

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub.

## Acknowledgements

Based on [Habit Tracker 21](https://github.com/zoreet/habit-tracker), with significant adaptations for focus tracking and planning.

## License

GPL-3.0 License - See LICENSE.md for details.
