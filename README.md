# Focus Tracker

Track your focus!

Based on[Habit Tracker 21](https://github.com/zoreet/habit-tracker), but adapted for tracking focus, attention, and effort, you may find this useful if you to help channel your hyperfocus or set your time-block targets if you have a neurological configuration that faciliates ADHD characteristics and behaviorial patterns.

## Usage

1. Create a folder to track your focus, efforts, habits, etc., for e.g., `journals/projects/focus` or `efforts/focus-logs`.
2. Create empty files inside that folder for each habit you want to track. You can add a `title` frontmatter field to provide a meaningful label for this entry: e.g.,

```
---
title: "Project 21"`.
---

```

3. Display the tracker, in for e.g., your home page or daily log:

~~~
```focustracker
{
	"path": "efforts/focus-logs"
}
```
~~~

## Parameters

- **path** _[mandatory]_: a string containing a path to a folder or specific focus target (an Obsidian note dedicated to collecting records about focus or effort invested in on specific project, habit, activity, etc.).
    The `path` field can be a path to a specific note, i.e., a single focus target, or multiple if it is to a folder as all files on that path, including subfolders will be tracked.

## Acknowledgements

Forked from [@holroy](https://github.com/holroy)'s [fork](https://github.com/holroy/habit-tracker) of [Habit Tracker 21](https://github.com/zoreet/habit-tracker).

