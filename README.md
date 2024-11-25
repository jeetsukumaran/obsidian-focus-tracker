# Focus Tracker

## Synopsis

Track and align your focus!

Focus Tracker is an Obsidian plugin for tracking activity, progress, and engagement across your notes over time. It creates a visual timeline that helps you monitor patterns, maintain consistency, and identify gaps in your attention areas.

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

### Use Cases

- **Research Progress**: Track engagement with different research threads, marking days with breakthroughs, reviews, or blocks
- **Project Management**: Monitor activity across multiple project workstreams, identifying active and stalled tracks
- **Habit Formation**: Visualize your consistency in engaging with specific topics or practices
- **Learning Journeys**: Track your engagement with different subjects or skills you're developing
- **Content Creation**: Monitor your writing or content development progress across different pieces
- **Task Management**: Keep an eye on recurring responsibilities or long-running tasks
- **Goal Tracking**: Monitor progress on different goals or objectives over time

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Focus Tracker"
4. Click Install, then Enable


## Quick Start

Add a focus tracker to any note using this code block:


````
```focustracker
tag-set:
  - track/research
  - lane/active
```
````

This will:
1. Find all notes tagged with BOTH `#track/research` AND `#lane/active`
2. Create a row for each matching note
3. Show a timeline where you can track engagement

Other options let you add metadata columns or customize the structure and appearance of the board.

## Specifying the "tracks" to be viewed

A "track" in this context, is just the note(s) that you want to view in the dashboard.

### Tag-based selection

Find notes with ANY of these tags:

````
```focustracker
tags:
  - area/health
  - area/fitness
````

Find notes with ALL of these tags:

````
```focustracker
tag-set:
  - status/active
  - type/project
````

Exclude notes with ANY of these tags:

````
```focustracker
tag-set:
  - status/active
  - type/project
exclude-tags:
  - status/hold
  - status/completed
```
````

Exclude notes with ALL of these tags:

````
```focustracker
tags:
  - area/work
exclude-tag-set:
  - status/archived
  - status/inactive
```

````


### Tag-based selection with regular expression patterns

All tag-based queries support regular expressions, making it powerful to select notes with specific tag patterns. The pattern is matched against the full tag (without the `#` prefix).

#### Basic Tag Queries with Patterns

Match tags starting with "area/":

````
```focustracker
tags:
  - ^area/
```

````

Match any health-related tags:

````
```focustracker
tags:
  - health
  - health/.*     # Matches health/mental, health/physical, etc.
```

````

Complex pattern matching:

````
```focustracker
tag-set:
  - ^track/p      # Matches track/project, track/personal, etc.
  - status/(active|pending)   # Matches status/active or status/pending
```

````

#### Excluding with Patterns

Exclude all archived tracks:

````
```focustracker
tags:
  - ^track/
exclude-tags:
  - .*/archived$   # Excludes any tag ending in "archived"
```

````

#### Common Pattern Examples


````
```focustracker
# Find active projects but exclude maintenance tasks
tags:
  - ^project/.*
exclude-tag-set:
  - type/maintenance
  - status/(done|archived)

# Track all areas except personal
tags:
  - ^area/
exclude-tags:
  - area/personal/.*

# Monitor specific project phases
tag-set:
  - ^project/
  - phase/(planning|execution)

# Complex categorization
tags:
  - ^(area|domain)/tech/.*  # Matches both area/tech/... and domain/tech/...
exclude-tags:
  - .*/legacy$
  - status/(hold|blocked)
```

````

The pattern matching follows regular expression rules, where:
- `^` matches the start of the tag
- `$` matches the end of the tag
- `.` matches any character
- `.*` matches zero or more characters
- `|` means OR
- `()` groups patterns together
- `[]` matches any single character from the set

### Property-based selection

Select files by frontmatter properties:

````
```focustracker
properties:
  status: active
  priority: high
```
````

### File path selection methods


Select files by path pattern:

````
```focustracker
paths:
  - Projects/Active
  - Areas/Health
```
````

### Combined selection

You can combine any selection methods:

````
```focustracker
paths:
  - Projects/
tags:
  - status/active
properties:
  priority: high
exclude-tags:
  - status/hold
```

````

## Features

### Timeline Control
- Set the number of past and future days to display
- Navigate through time with forward/backward controls
- Jump to today with a single click
- Set a focal date to center your view

### Visual Indicators
- Distinguish weekends from weekdays
- Highlight today's date
- Mark future dates distinctly
- Highlight the focal date

### Engagement Tracking
- Click cells to cycle through rating levels
- Right-click for precise rating selection
- Add remarks to any day's entry
- Use flags for special conditions or states

### Custom Columns

# Focus Tracker

[Previous sections remain unchanged until Custom Columns section]

### Custom Columns
Add metadata columns from your notes in two ways:

#### 1. Simple Format (Legacy)
Uses property names directly as column headers:

````
```focustracker
tag-set:
  - type/project
prefix-columns:
  - status
  - priority
postfix-columns:
  - due-date
  - assigned-to
```
````

#### 2. Dictionary Format (New)
Specify custom display names for columns:

````
```focustracker
tag-set:
  - type/project
prefix-columns:
  "Status": status
  "Priority Level": priority
  "Project Type": project-type
postfix-columns:
  "Due Date": due-date
  "Assigned To": assigned-to
  "Completion %": completion-percentage
```
````

The dictionary format allows you to:
- Use friendly display names in column headers
- Reference property names that might not be ideal for display
- Maintain cleaner visualization while keeping flexible property names

Features:
- Sort by clicking column headers
- Resize columns by dragging
- Values from frontmatter properties
- Arrays displayed with bullet separators
- Truncated values show in tooltips

### Display Customization
- Alternating row colors for better readability
- Adjustable date column spacing
- Optional column borders
- Customizable through CSS variables

### Persistence
- All ratings and remarks are stored in note frontmatter
- Data format is plain YAML
- Easy to query or process with other tools
- No external dependencies

## Configuration

### Rating Maps
Custom rating symbols and flags can be configured in settings:

````
```focustracker
rating-map: research    # Use research rating set
flag-map: blockers     # Use blocker flag set
```

````

### Title Display

Control which frontmatter property to use as row label:

````
```focustracker
title-property-names:
  - track-label
  - focus-tracker-title
  - title
```

````

### Using the rating system

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

````
```focustracker
paths: "research/"
rating-map: "moonPhases"
flag-map: "academic"
days-past: 14
days-future: 7
```
````




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
````
```focustracker
paths: "research/projects"
rating-map: "digitsFilled"
flag-map: "academic"
```
````

- Rate paper-writing sessions (1-10)
- Flag upcoming deadlines 📅
- Mark sections needing focus 📚
- Track experiment progress 🔬

#### Reading List

````
```focustracker
paths: "reading/"
rating-map: "moonPhases"
flag-map: "academic"
```
````

- Rate comprehension of papers
- Flag must-read papers 📚
- Mark papers for discussion ✍️
- Track reading group assignments

#### Health & Wellness


````
```focustracker
paths: "personal/health"
rating-map: "colors1"
flag-map: "health"
```

````
- Track exercise sessions 🏃
- Rate sleep quality 😴
- Plan meal prep 🥗
- Schedule workouts ⏳

#### Teaching Assistant Duties

````
```focustracker
paths: "teaching/"
rating-map: "digitsFilled"
flag-map: "academic"
```

````

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
