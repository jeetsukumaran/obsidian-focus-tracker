# Focus Tracker

Track your focus!

Based on[Habit Tracker 21](https://github.com/zoreet/habit-tracker), but adapted for tracking focus, attention, and effort, you may find this useful if you to help channel your hyperfocus or set your time-block targets if you have a neurological configuration that faciliates ADHD characteristics and behaviorial patterns.

## Usage


### Basic mechanisms

#### Create a focus tracker

A focus tracker can be embedded or added to any note with a ``focustracker``  YAML-format codeblock:

~~~
```focustracker
"path-pattern": "coordination/tracks/"
```
~~~

##### Parameters

- **path-pattern** _[mandatory]_: a (string) pattern found in the full path to a tracking log to be included in this view.


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

while can also create more specialized focus-trackers, e.g.

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

