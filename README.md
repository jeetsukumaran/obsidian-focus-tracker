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
        areas1.md
        areas1.focus-log
        areas2.md
        areas2.focus-log
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

A focus tracker can be set up with the following code block:

```focustracker
path-pattern: "focus-log"
```

Any file in the vault with the substring "`focus-log`" in its path will show up in this focus tracker.

##### Directory based

Alternatively you could organize your content as follows:

```
vault/
  coordination/
    areas/
    projects/
    tracks/
        areas/
            area1.md
            area2.md
        habits/
            habit1.md
            habit2.md
        personal/
            personal-prj1.md
            personal-prj2.md
            personal-prj3.md
        projects/
            project1.md
            project2.md
            project3.md
            project4.md
```

```focustracker
path-pattern: "coordination/tracks/"
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

