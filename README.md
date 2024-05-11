# Focus Tracker

Track your focus!

Based on[Habit Tracker 21](https://github.com/zoreet/habit-tracker), but adapted for tracking focus, attention, and effort, you may find this useful if you to help channel your hyperfocus or set your time-block targets if you have a neurological configuration that faciliates ADHD characteristics and behaviorial patterns.

## Usage


### Basic mechanisms

#### Setup the focus track log files or folder

Create a folder to track your focus, efforts, habits, etc.


For example, if the various activities, projects, etc. in your vault are organized as follows:

```
vault/
  coordination/
    areas/
        areas1.md
        areas2.md
    projects/
        project1/
        ...
        project2/
        ...
        project3/
        ...
        project4/
        ...
```

You could create the following to track everything together, including habits and personal projects, with:

```
vault/
  coordination/
    areas/
    projects/
    tracks/
        area1.md
        area2.md
        habit1.md
        habit2.md
        personal-prj1.md
        personal-prj2.md
        personal-prj3.md
        project1.md
        project2.md
        project3.md
        project4.md
```

You can adjust what these tracks are called or labeled in the focus tracker by providing a ``focus-tracker-title`` or ``title`` field in the frontmatter YAML metadata of the note:

```
---
title: "Project 1"`.
---

```

or:

```
---
focus-tracker-title: "(02) Project Winter"
title: "The winter of discontent".
---

```

#### Start tracking (and planning) focus!

A focus tracker can be embedded or added to any note with a ``focustracker``  YAML-format codeblock:

~~~
```focustracker
"path": "coordination/tracks/"
```
~~~

## Parameters

- **path** _[mandatory]_: a string containing a path to a folder or specific focus target (an Obsidian note dedicated to collecting records about focus or effort invested in on specific project, habit, activity, etc.).
    The `path` field can be a path to a specific note, i.e., a single focus target, or multiple if it is to a folder as all files on that path, including subfolders will be tracked.

## Acknowledgements

Forked from [@holroy](https://github.com/holroy)'s [fork](https://github.com/holroy/habit-tracker) of [Habit Tracker 21](https://github.com/zoreet/habit-tracker).

