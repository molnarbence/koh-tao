---
name: user-story-writing
description: Use when writing user stories, defining acceptance criteria, slicing epics, or refining a backlog. Covers INVEST principles, Gherkin syntax, story templates, and common pitfalls.
---

# User Story Writing

Write effective user stories that capture customer value, enable development teams, and ensure clear acceptance criteria for agile delivery.

## Story Format

```
As a [type of user],
I want [an action or feature],
So that [a benefit or value].
```

**Example:**
> As a customer, I want to save items to a wishlist, so that I can purchase them later.

## INVEST Principles

| Letter | Principle | Meaning |
|--------|-----------|---------|
| I | Independent | Can be developed in any order |
| N | Negotiable | Details can be discussed and refined |
| V | Valuable | Delivers clear value to users or business |
| E | Estimable | Team can estimate effort required |
| S | Small | Can be completed within a sprint |
| T | Testable | Has clear pass/fail criteria |

## Story Components

- **Title**: brief, descriptive name
- **Description**: As a/I want/So that format
- **Acceptance Criteria**: specific conditions for completion
- **Story Points**: complexity/effort estimate (1, 2, 3, 5, 8, 13)
- **Priority**: Critical / High / Medium / Low
- **Dependencies**: related stories or technical requirements

## Templates

### User Story

```markdown
## [Story Title]

**As a** [user type]
**I want** [action/feature]
**So that** [benefit/value]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Story Points:** [1, 2, 3, 5, 8, 13]
**Priority:** [Critical, High, Medium, Low]
**Dependencies:** [List any dependencies]
**Notes:** [Additional context]
```

### Epic

```markdown
## Epic: [Epic Name]

**Goal:** [What we want to achieve]
**Success Metrics:** [How we measure success]

**User Stories:**
1. Story 1 - [Brief description]
2. Story 2 - [Brief description]
3. Story 3 - [Brief description]

**Timeline:** [Target quarter/release]
**Business Value:** [Why this matters]
```

## Acceptance Criteria — Gherkin Syntax

Use Given/When/Then for complex scenarios:

```gherkin
Scenario: Successful login with valid credentials
  Given I am on the login page
  When I enter valid email "user@example.com"
  And I enter valid password "SecurePass123"
  And I click the "Login" button
  Then I should be redirected to the dashboard
  And I should see a welcome message

Scenario: Failed login with invalid password
  Given I am on the login page
  When I enter valid email and invalid password
  And I click "Login"
  Then I should see "Invalid credentials"
  And I should remain on the login page
```

## Story Slicing

Break a large epic into sprint-sized stories:

**Epic:** As a user, I want a comprehensive dashboard so that I can monitor all my metrics.

**Sliced:**
1. As a user, I want to view key metrics (revenue, users) so that I can see high-level performance. *(5 pts)*
2. As a user, I want to filter metrics by date range so that I can analyze specific time periods. *(3 pts)*
3. As a user, I want to export dashboard data to CSV so that I can analyze it in Excel. *(3 pts)*
4. As a user, I want to customize which metrics display so that I can focus on what matters to me. *(5 pts)*

## Specialized Story Types

### Technical Story

```markdown
**As a** developer
**I want** to optimize the user search API response time
**So that** the application provides a better user experience

**Acceptance Criteria:**
- API response time under 200ms (p95)
- Database queries optimized with proper indexing
- Caching implemented for frequent searches
- Load testing confirms improvement
- No regression in search result accuracy
```

### Bug Fix Story

```markdown
**As a** customer
**I want** the payment to process correctly
**So that** I can complete my purchase

**Current Behavior:** [what breaks and when]
**Expected Behavior:** [what should happen]
**Acceptance Criteria:** [measurable fix conditions]
```

### Non-Functional Story

```markdown
**As a** user
**I want** pages to load quickly
**So that** I have a smooth browsing experience

**Acceptance Criteria:**
- Homepage loads under 2s (p90)
- LCP under 2.5s, FID under 100ms, CLS under 0.1
- Verified on mobile and desktop with Lighthouse
```

### Job Story (alternative format)

```
When [situation], I want to [motivation], so I can [expected outcome].
```

> When I'm reviewing my monthly expenses, I want to filter transactions by category, so I can understand where I'm spending the most money.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Writing technical tasks instead of user stories | Always include who and why |
| Story too large (spans multiple sprints) | Slice into smaller independent stories |
| Vague acceptance criteria | Make each criterion specific and testable |
| Missing "so that" | The value statement is mandatory |
| Implementation details in the story | Keep stories solution-agnostic |
| No edge cases covered | Add error and boundary scenarios |

## Best Practices

**Writing:**
- Focus on value — every story delivers user/business value
- Write from the user's perspective — emphasize who and why
- Keep stories independent — minimize dependencies
- Estimate relative size — use story points, not hours

**Acceptance Criteria:**
- Be specific and unambiguous
- Cover happy path, error path, and edge cases
- Include non-functional requirements (performance, security, accessibility)
- Get team agreement before the sprint starts
