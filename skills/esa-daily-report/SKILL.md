---
description: >
  Automatic daily report creator for esa.io with Google Calendar integration.
  Triggers on keywords: "日報", "daily report", "振り返り", "reflection", "今日の記録", "today's summary",
  "esa", "日次レポート", "デイリーレポート".
  Streamlines daily reporting process by auto-fetching calendar events and following structured template format.
  Project-specific automation for team communication but customizable for different teams.
allowed-tools: Read, Write, Bash, Task
---

# esa Daily Report Creator

## Overview

This skill enables automatic creation of daily reports (日報) in esa.io by integrating with Google Calendar and following a structured template format.

## Purpose

To streamline the daily reporting process by:

- Automatically fetching calendar events for the day
- Structuring information according to a predefined template
- Creating WIP posts in esa with proper categorization
- Providing a consistent format for team communication

## When to Use This Skill

- User requests daily report creation (e.g., "今日の日報を作成", "日報作って")
- User mentions creating or posting a daily report
- User asks to summarize today's activities for esa

## Configuration

### Default Settings

- **esa Team**: `gaji`
- **screen_name**: Auto-detected from current user (using `esa_get_team_members`)
- **Template Post Number**: `#126`
- **Category**: `report/daily-report/`
- **Post Status**: WIP (Work In Progress)

### Customization

These settings can be overridden by user preferences:

- User can specify different screen_name
- User can request different category path
- User can specify date other than today

## Required Tools

1. **esa_get_team_members** - Get current user's screen_name
2. **list_gcal_events** - Fetch calendar events
3. **esa_create_post** - Create post in esa
4. **view** - Read template file (if needed)

## Execution Flow

### Step 0: Get Current User's screen_name

```markdown
Use esa_get_team_members with:
- teamName: 'gaji' (or user-specified)
- Find member with "myself": true
- Extract screen_name from that member
```

This ensures the daily report is automatically created with the correct user's screen_name.

### Step 1: Fetch Calendar Events

```markdown
Use list_gcal_events with:
- calendar_id: 'primary'
- time_min: Start of target day (00:00:00)
- time_max: End of target day (23:59:59)
- time_zone: User's timezone (default: Asia/Tokyo)
```

**Event Filtering Rules:**

- Exclude work style events (e.g., "自宅勤務", "Home office")
- Exclude "チーム朝会" from MTG振り返り section (but keep in 今日やったこと)
- Include all other calendar events

### Step 2: Gather User Input

**Read the template file first** to understand what sections need to be filled.

Use `view /mnt/skills/user/esa-daily-report/assets/default.md` to:

1. Identify all sections that require user input (those with placeholder `-` or empty content)
2. Dynamically determine which information to collect based on the template

**Interaction Strategy:**

- **Option A (Recommended)**: Skip asking questions entirely and create the report with calendar events only. User can edit the WIP post in esa to fill in other sections.
- **Option B**: If the user seems engaged, briefly ask: "他に記載したい情報はありますか？（学んだこと、リードとしての動き、MTG振り返りなど）" and collect only what they provide.

**Guidelines:**

- Show calendar events first, so user knows what happened today
- Do NOT ask for each section individually - this is time-consuming
- Empty sections are completely acceptable and expected
- User can always edit the WIP post in esa afterward
- Be conversational and supportive, not robotic

**Default behavior**: Create the report with calendar events and empty sections for other content. This respects the user's time while providing a structured starting point they can fill in later.

### Step 3: Structure the Report

**CRITICAL: Always read the template from `/mnt/skills/user/esa-daily-report/assets/default.md` before structuring the report.**

Use the `view` tool to read the template file:

```bash
view /mnt/skills/user/esa-daily-report/assets/default.md
```

The template defines the exact structure and sections for the daily report. Follow this template structure when building the report content, replacing placeholder text with:

- Calendar events in the "今日やったこと" section
- User input in each respective section
- Meeting names for "MTG 振り返り" subsections

**Template Processing Rules:**

- **Ignore h1 headings** (`# xxx` format) from the template - do not include them in the final report
- Include h2 and below headings (`## xxx`, `### xxx`, etc.) as they define the report structure
- This ensures the report doesn't have duplicate top-level titles

**Do not hardcode the template structure** - always reference the template file to ensure consistency and allow for easy template updates.

### Step 4: Create esa Post

```markdown
Use esa_create_post with:
- teamName: 'gaji' (or user-specified)
- name: 'Daily 振り返り YYYY.MM.DD : [screen_name] #reflection'
  Example: 'Daily 振り返り 2025.10.22 : screen_name #reflection'
- bodyMd: [Structured content from Step 3]
- category: 'report/daily-report/'
- wip: true
- tags: [] (no tags by default, user can specify)
```

### Step 5: Confirm and Share

- Inform user that the report has been created
- Share the esa post URL
- Offer to make adjustments if needed

## Example Usage

**User**: "今日の日報を作成して"

**Assistant Flow (Default - No Questions)**:

1. Get current user's screen_name from esa_get_team_members
2. Fetch today's calendar events
3. **Read template structure from `/mnt/skills/user/esa-daily-report/assets/default.md`**
4. Present events to user: "今日はこれらの予定がありましたね: [list events]"
5. Create post in esa with calendar events and empty sections for other content
6. Reply: "日報を作成しました！[URL] カレンダーの予定を記載しています。他の内容は後からesaで編集できます。"

**Alternative Flow (If User Provides Info Upfront)**:
If user says: "今日の日報を作成して。今日はReactのuseEffectについて学んだよ。"

1. Get screen_name
2. Fetch calendar events
3. Read template
4. Recognize user provided "今日学んだこと" content
5. Create post with both calendar events AND the provided information
6. Reply: "日報を作成しました！[URL]"

## Date Handling

**Current Date Detection:**

- Always get the current date/time from system
- Default to today unless user specifies otherwise
- Support phrases like "昨日の日報", "yesterday's report"

**Time Zone:**

- Default: Asia/Tokyo (JST)
- Format times as RFC3339 with timezone offset
- Example: 2025-10-22T00:00:00+09:00

## Error Handling

### Common Issues

1. **No calendar events found**
   - Still create report with user input only
   - Note: "カレンダーには予定がありませんでした"

2. **esa API errors**
   - Inform user clearly
   - Offer to retry or adjust parameters

3. **Missing user input**
   - This is the normal and expected case
   - Create post with calendar events and empty sections
   - User will fill in details later in esa

### Validation

- Check team name exists using `esa_get_teams`
- Verify date format is valid
- Ensure category path follows esa conventions (no leading slash)

## Tips for Best Results

### For Claude

- **ALWAYS read the template file first**: Use `view /mnt/skills/user/esa-daily-report/assets/default.md` at the start of Step 3
- Never hardcode the template structure - always reference the actual template file
- Be conversational - don't just collect data mechanically
- Adapt to user's communication style
- If user provides all info upfront, skip incremental questions
- Remember that WIP posts can be edited later
- The template file is the single source of truth for report structure

### For Users

- You can provide information in any order or skip it entirely
- The skill creates a WIP post with calendar events - you can fill in other sections later in esa
- If you want to include specific info immediately, just mention it: "今日の日報を作成。Reactを学んだよ。"
- Empty sections are expected and normal - edit the post later at your convenience
- You can edit the WIP post in esa after creation
- Specify if you want a different date or category

## Template Reference

**Location**: `/mnt/skills/user/esa-daily-report/assets/default.md`

**Usage**: This template file is the single source of truth for daily report structure.
Claude MUST read this file using the `view` tool during Step 3 before structuring any report.

**Benefits of template file approach**:

- Easy to update template without changing SKILL.md
- Team can customize template for their needs
- Ensures consistency across all reports
- No hardcoded structure in the skill logic

**To customize**: Edit `/mnt/skills/user/esa-daily-report/assets/default.md` directly.

## Maintenance Notes

- Template format can be customized per team needs
- Default settings can be updated in this SKILL.md
- Consider adding support for weekly/monthly reports in future iterations
