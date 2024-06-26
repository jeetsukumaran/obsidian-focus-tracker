# Focus Tracker

Track and align your focus!

![image](https://github.com/jeetsukumaran/obsidian-focus-tracker/assets/26183/4e7343d0-c1ad-49e1-a077-1e0ec48dc135)

## Synopsis

### What

Based on[Habit Tracker 21](https://github.com/zoreet/habit-tracker), but adapted for tracking past focus, attention, and effort, and help in directing focus and energy so as to better align with the directions you want to go.


### Why

One may find this useful as a component of their productivity/task-management system to help decide what areas need more attention in the future based on lack of attention or quality of attention in the past, leading to different prioritization of tasks, or as lead indicators in an OKR framework.

I also find this useful as a component of my ADHD self-management system to help align my hyperfocus with my intent, setting time-block targets, etc..

## Usage


### Basic concepts

Assume you have at least one distinct (unique) reference every project, activity, effort, area, habit, or aspect of your life that you wish to track.
The YAML frontmatter metadata of this note will be used to log every day that you "push", "work on", touch, visit, or dedicate any attention or focus on this project.
There are many different ways to designate a note as the a "focus log", and any note can serve this purpose, either an existing one or a new one, or one serving some other (compatible) purpose.

### Basic mechanisms

#### Create a focus tracker

A focus tracker can be embedded or added to any note with a ``focustracker``  YAML-format codeblock that provides a variety of ways of selecting files that serve as tracking logs:

~~~
```focustracker
"paths": "coordination/tracks/"
```
~~~

~~~
```focustracker
tags:
- "project"
- "reading/april"
```
~~~

~~~
```focustracker
properties:
    "track-focus": true
```
~~~

##### Parameters

- **paths**: a (string) or list of string patterns found in the full path to a tracking log to be included in this view. Any note can be used for this -- in the above example they are dedicated log files, but they can also be: project summaries, novel manuscript journals, etc.


    ~~~
    ```focustracker
    paths:
      - "hobby.*log"
      - "project.*log"
      - "training.*log"
    ```
    ~~~

- **tags**: a list of string patterns that will be matched to tags (note: omit the leading '#'):

    ~~~
    ```focustracker
    tags:
      - "role/effort"
    ```
    ~~~

    ~~~
    ```focustracker
    tags:
      - "project/priority"
      - "training/priority"
      - "learning/january"
    ```
    ~~~

- **properties**: a dictionary mapping YAML frontmatter field names to matching values:


    ~~~
    ```focustracker
    properties:
      "project-status": "active"
    ```
    ~~~

    ~~~
    ```focustracker
    properties:
      "project-status": "active"
      "development-status": "pilot"
    ```
    ~~~





#### Create files or folders to track your focus, efforts, habits, etc

For example, imagine the various activities, projects, etc. in your vault are organized as follows:

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

Create files to track your focus, using a naming convention such as, for e.g. a filename that ends with "`.focus-log`":

```
vault/
  coordination/
    areas/
        focus-log.area1
        focus-log.area2
    logs/
        focus-logs/
            areas/
                garage.md
                space-lasers.md
            personal/
                reading1.md
                writing2.md
            projects/
                project3.md
                project4.md
                project4.md
                plan9-os.md
        habit-logs/
             log.habit1.md
             log.habit2.md
        practice-logs/
             log.ex1.md
             log.ex2.md
    projects/
        project1/
            ...
            project1.focus-log
            ...
        project2/
            ...
            project2.focus-log
            ...
        project3/
        ...
        project4/
        ...
```

Any file in the vault with the substring "`focus-log`" in its path will show up in this focus tracker,

```focustracker
path-pattern: "focus-log"
```

Any pattern can be used, e.g.:

```focustracker
path-pattern: "focus-log.*area"
```

```focustracker
path-pattern: "coordination/logs/focus-logs/personal"
```

```focustracker
path-pattern: "habit-logs/"
```

```focustracker
path-pattern: "practice-logs/"
```

And lists are also supported:

~~~
```focustracker
path-pattern:
  - "learning.*log.focus"
  - "personal.*log.focus"
```
~~~


#### Customizations

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

## Acknowledgements

Forked from [@holroy](https://github.com/holroy)'s [fork](https://github.com/holroy/habit-tracker) of [Habit Tracker 21](https://github.com/zoreet/habit-tracker).


## License

This work uses work released under the GNU GPL 3 by the following:

- [zoreet](https://github.com/zoreet/habit-tracker)
- [holroy](https://github.com/holroy/habit-tracker)

and, as given by those terms, is itself also made available under the same license.

See LICENSE.md for details.







