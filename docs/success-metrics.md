---
linear: MXB-22
status: accepted
---

# Success metrics

Decisions from a grilling session (MXB-22). Complements [positioning](positioning.md) (MXB-23).

## Purpose

Measure whether users are winning (outcome first), with product metrics as diagnostics. Internal only for MVP; no user-facing stats until post-MVP.

## North star

**Board activation rate** — % of weekly active Board viewers with at least one Queue or Up Next → Playing transition that week.

User outcome leads. This answers: *of people who saw their queue, did they start playing something they chose to put there?*

### Event definition

| Counts | Does not count |
|---|---|
| Queue → Playing | Done → Playing (replay) |
| Up Next → Playing | Any move into Playing from outside the Board |
| | Re-entries while already in Playing |

### Denominator

**Weekly active Board viewer** — user who viewed the Board at least once that week. Triage-only visits use a separate funnel (see Diagnostics).

### Depth diagnostic

**Avg transitions per activated user** — among users who had at least one qualifying transition that week, average count of Queue/Up Next → Playing events. Not a goal; signals depth of engagement among activated users.

## MVP benchmarks (hypotheses)

Revisit after 4–6 weeks of real usage. Internal targets only.

| Metric | Target | Notes |
|---|---|---|
| Board activation rate | ≥ 40% of Board-view WAU | Core loop health |
| Avg transitions per activated user | ≥ 1.5/week | Modest depth; not power-user volume |
| 7-day return rate | ≥ 30% of new users | Intrinsic return without streaks |
| Avg Board size (Queue + Up Next) | ≤ 15 games | Short Board you trust |

## Diagnostics

Tracked for product learning. Never north star. No user-facing targets.

| Metric | Funnel | Role |
|---|---|---|
| Triage sessions/week | Triage WAU (viewed Triage at least once) | Side-quest engagement; no target |
| Avg Board size | All Board viewers | Outcome proxy for "short Board you trust" |
| Games reaching Done/week | Board viewers | Secondary outcome signal |
| 7-day return rate | New users | Product health |
| Done → Playing (replays) | Optional | Legitimate behavior excluded from north star |

**Dropped:** % library reviewed as a success metric. Conflicts with play-first, no-inbox-zero positioning. Raw unreviewed count may be useful for ops only.

## User-facing metrics

| Phase | Approach |
|---|---|
| **MVP** | None. Board state (cards, columns) is the only feedback. All metrics internal. |
| **Post-MVP** | Opt-in insights page. Personal state only: Done count, Board size, maybe play history. No ratios, benchmarks, streaks, or guilt copy. Triage progress optional, framed as "games you've looked at" not "% complete". |

## What we are not optimizing for

- Triage volume or daily triage habits
- Library review completion or inbox zero
- Completionist metrics (100% Done, achievements)
- Engagement hacks (streaks, nags, unreviewed banners)
