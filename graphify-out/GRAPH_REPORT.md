# Graph Report - cosmic-reader  (2026-08-14)

## Corpus Check
- 22 files · ~120,716 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 160 nodes · 148 edges · 22 communities (19 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5b7bb614`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `Priority Issues` - 7 edges
2. `🚀 Cosmic Reader` - 7 edges
3. `Article-by-Article Detail` - 7 edges
4. `Priority Issues` - 6 edges
5. `handler()` - 6 edges
6. `Image Audit Report — Cosmic Reader Dashboard` - 6 edges
7. `Live verification (signed-in dashboard, real DOM)` - 4 edges
8. `scripts` - 4 edges
9. `Deferred items — Cosmic Reader` - 2 edges
10. `jsonError()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (22 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (13): Article [0] — LIGO's Primordial Black Hole Detection, Article [1] — Hunting Moon Water With Neutrons, Article [2] — Hera Aces Massive Engine Burn to Didymos, Article [3] — Jupiter's Lightning Is Up To 1 Million Times More Powerful, Article [4] — How Did Venus Become a Hellscape?, Article [5] — AI Models Reach New Frontier, Article-by-Article Detail, Before → After per category (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (9): APP, classBlk, ctx, fs, guessFn, kwCats, path, src (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (10): dependencies, @vercel/speed-insights, devDependencies, tailwindcss, @tailwindcss/container-queries, @tailwindcss/forms, scripts, build (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (8): APP, art, ctx, fn, fs, path, src, vm

### Community 4 - "Community 4"
Cohesion: 0.20
Nodes (7): APP, ctx, fs, parseFn, path, src, vm

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (8): 🚀 Cosmic Reader, Features, Getting Started, Philosophy, Rebuilding the CSS, RSS Sources, Tech Stack, What It Is

### Community 6 - "Community 6"
Cohesion: 0.52
Nodes (6): buildIssueBody(), callHealthcheck(), commentOnIssue(), createIssue(), findOpenIssue(), handler()

### Community 7 - "Community 7"
Cohesion: 0.50
Nodes (3): handler(), probeUrl(), PUBLISHER_SAMPLES

### Community 8 - "Community 8"
Cohesion: 0.50
Nodes (4): ALLOWED_HOSTNAMES, handler(), isAllowed(), UA_POOL

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (3): config, handler(), jsonError()

### Community 10 - "Community 10"
Cohesion: 0.67
Nodes (3): handler(), isHostAllowed(), OG_ALLOWED_HOSTS

### Community 11 - "Community 11"
Cohesion: 0.67
Nodes (3): config, handler(), jsonError()

### Community 12 - "Community 12"
Cohesion: 0.50
Nodes (3): crons, outputDirectory, rewrites

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (9): APP, ctx, fs, HEADLINES, NASA_NAV, path, REAL_PROSE, src (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (17): Confirmed (observed, not inferred), Corrected after observation, Design Health Score, Design Specificity Verdict, Live verification (signed-in dashboard, real DOM), Minor Observations, Note, Overall Impression (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (15): Comparability caveat — read before trusting the delta, Design Health Score, Deterministic scan, Minor observations, [P1] Deploy Probe reports its result in three contradictory places, none where the user is looking, [P1] Material Symbols ligature text is exposed to assistive tech app-wide, [P1] No URL routing — every view is `/app.html`, [P2] Filter chips have no selected state for assistive tech; source select has no label (+7 more)

## Knowledge Gaps
- **97 isolated node(s):** `Still open (from the 2026-08-14 critique, lower priority)`, `Design Health Score`, `What actually moved, and why`, `Comparability caveat — read before trusting the delta`, `Deterministic scan` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Still open (from the 2026-08-14 critique, lower priority)`, `Design Health Score`, `What actually moved, and why` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 19` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 20` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._