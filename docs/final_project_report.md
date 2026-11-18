Independent University, Bangladesh  
CSE309 Web Application & Internet  

# Final Project Submission Report

**Submitted by:**  
Name: Write your full name here  
Student ID: Write your IUB ID here  
Section: Write your section here  
Team Number: Write the team number assigned by the instructor here  

Project Title: Write your project title here  
Vercel URL: Paste your Vercel deployment link here  
GitHub Repository: Paste your GitHub repository link here  

**Submitted To:**  
Sayef Reyadh  
Adjunct Lecturer  
Department of Computer Science & Engineering  
Independent University, Bangladesh  

Semester: Autumn 2026  
Date of Submission: Write the submission date here

## How to use this report
This document shows the sections your final report must have and what each section must contain. Keep the headings and numbering. Replace the grey guidance text with your own content. Blue italic lines show where a diagram, table or screenshot goes: replace them with the real figure and a caption that says what it proves. Write about your finished project, not about plans.

- Write in your own words. Every statement must match your running application.
- Number every diagram, table and screenshot (Figure 1, Table 1, S1) and refer to them in the text.
- Use the same requirement IDs (FR-AUTH-01 and so on) in the requirements, the tests and the screenshots.
- Never show real passwords, secret keys or full tokens in screenshots or text (blur or mask them).
- Submit the report twice: REPORT.md in the repository and a PDF with the screenshots.

## Table of Contents
Insert an automatic table of contents (Insert, Table of contents). Add a List of Figures and Screenshots with the number, caption and page of each.

*[Table of contents]*
*[List of figures and screenshots]*

## 1. Executive Summary
Length: one page. A reader who reads only this page must understand the project.

### 1.1 Project overview
Project name, one paragraph on what the system does and for whom, and the stack in one line (React with TypeScript, FastAPI, database, Vercel).

### 1.2 What was built since the mid assessment
One sentence for each major addition, named as it appears in the app:

- JWT authentication with refresh and logout
- Role based access control (roles, ownership, group permissions)
- Admin dashboard (users, content, activity log, security view, exports)
- Audit logging, brute-force protection, deployment on Vercel

### 1.3 Live links and test accounts
A table with: GitHub repository, Vercel frontend, API, API docs, video demo, and the seeded demo accounts (email, role, where to find the password). Use demo data only.

*[Table 1: links and accounts]*

## Part A. Product Requirements (PRD)
Length: two to three pages. This part says what the product is for, not how it is built.

### A1. Problem Statement
One or two paragraphs: who has the problem, how they cope today, and why it matters. Do not describe your solution here.

### A2. Users and Roles
A table with one row per role: Visitor, User, Group member or owner (if you have groups), Admin.
Columns: role, who they are, main tasks, what they must never be able to do.

*[Table 2: users and roles]*

### A3. Goals and Success Measures
Four to six goals. Each has a measurable, testable measure (a number, a time limit or a yes or no check). Include at least two security goals, for example: no user can read another user's data, sessions are short-lived and revocable.

*[Table 3: goal and measure]*

### A4. Scope and Non-Goals
Three lists: in scope (authentication, RBAC, groups, admin dashboard, audit log, deployment and your domain features), out of scope (what you decided not to build and why), and assumptions and constraints (browser support, hosting limits, time).

### A5. User Stories
At least ten stories in the form: As a (role) I want (action) so that (benefit). Give each an ID (US-01). Cover every role: at least two for authentication, three for RBAC or groups, three for the admin.

*[Table 4: user stories]*

## Part B. Software Requirements (SRS)
Length: four to six pages. This part says exactly what the system shall do. Every requirement is numbered and testable.

### B1. Introduction
Purpose of the document, intended readers, a short definitions table (JWT, access token, refresh token, RBAC, role, permission, audit log) and the references you used (for example RFC 7519, OWASP ASVS, FastAPI documentation).

### B2. Functional Requirements
Tables grouped by area, each requirement written as one sentence beginning 'The system shall' and having a unique ID. Cover at least:

- FR-AUTH: signup, login, password hashing and pepper, access token claims and lifetime, refresh and rotation, logout, session list and revoke, lockout, profile update, password change
- FR-RBAC: roles, server-side checks, ownership rules, group permissions (create, update, assign), owner-only actions, admin self-protection, banned user rejected on the next request
- FR-ADM: statistics, user list with search and filters, user detail, ban and unban, role change, session revoke, bulk actions, content moderation, activity log with filters, security view, CSV exports
- FR-DOMAIN: the features of your own resource

*[Table 5 to Table 8: functional requirements by area]*

### B3. Non-Functional Requirements
Measurable requirements in a table: security (secrets in environment variables, generic login errors), performance (pagination limits, response time target), usability (responsive, loading and error states), reliability (data persists after a restart), maintainability (one RBAC module, automated tests) and operations (migrations from scratch, seed script).

*[Table 9: non-functional requirements]*

### B4. Roles and Permission Matrix
This must match your implementation exactly. Give three tables:

- Endpoint groups against roles (Visitor, User, Group member, Group owner, Admin) with yes, no or own
- Group permissions: what create, update and assign each allow, and what only the owner can do
- Admin rules: what an admin cannot do (change own role, ban another admin) and what extra rights a system admin has inside a group (none, if so)

*[Table 10: endpoint groups by roles]*
*[Table 11: group permissions]*
*[Table 12: admin rules]*

### B5. Use Cases
At least six use cases: log in and refresh, create a record, change a member's permissions, a denied action, ban a user, read the audit log. For each: actor, preconditions, main flow as numbered steps, alternative and error flows (with status codes), postconditions.

*[Diagram: use case diagram with the actors and the use cases]*
*[Table 13: use case descriptions]*

### B6. Acceptance Criteria
Given, When, Then for every critical requirement. Cover at least: token expiry returns 401, a tampered token is rejected, a user cannot read another user's record, a member without a permission gets 403, a banned user is rejected on the next request, an admin cannot ban another admin.

*[Table 14: acceptance criteria]*

### B7. Traceability Matrix
One table linking each requirement to the endpoint or screen that implements it, the automated test that checks it and the screenshot that shows it. Every requirement must appear.

*[Table 15: requirement, endpoint or screen, test, screenshot]*

## Part C. Technical Design (TDD)
Length: six to nine pages. This part says how the system is built. A reader must be able to rebuild it from this part.

### C1. Technology Stack
A table: component, technology, version, reason for choosing it (frontend, UI library, backend, database, ORM, migrations, password hashing, JWT library, testing, hosting).

*[Table 16: technology stack]*

### C2. System Architecture
A diagram of the browser, the Vercel frontend, the Vercel API, the database and the audit log, with arrows for the requests, the access token header and the refresh cookie. Then two sentences for every arrow.

*[Diagram: system architecture]*

### C3. Backend and Frontend Structure
The folder tree of both projects (two levels), and a short explanation of where each thing lives: routes, services, repositories, models, the authentication code, the RBAC module and the admin code on the backend; pages, components, the API client, the authentication context and the route guards on the frontend.

*[Folder tree of the backend]*
*[Folder tree of the frontend]*

### C4. Data Model
An ER diagram with every table. For each table, a short table of columns, types, keys, constraints and indexes. Explain how roles, bans, sessions or refresh tokens, group membership with permissions, and the activity log are stored.

*[Diagram: ER diagram]*
*[Table 17 and onward: tables and columns]*

### C5. API Design
A table of every endpoint: method and path, authentication needed, required role or permission, request body, success status and error statuses. State the error response format and the API version prefix.

*[Table: endpoint list]*

### C6. JWT Authentication Design
Explain, with a diagram, how login, a protected request, token expiry, refresh, logout and reuse of an old refresh token work. Also cover:

- Token claims (user id, role, issued at, expiry), the signing algorithm and where the secret comes from
- Lifetimes of the access and refresh tokens and why you chose them
- Where the tokens are stored in the browser (memory, localStorage or httpOnly cookie), the risks of that choice (XSS, CSRF) and what you did about them
- What the server checks on every request (signature, expiry, user exists, user not banned)
- What the frontend does on a 401 (refresh once, then log out)

*[Diagram: JWT sequence diagram for login, request, expiry, refresh and logout]*
*[Table: token claims]*

### C7. RBAC Design
Explain how a request is authorised, in order: token, user, role check, ownership check, group permission check, handler. Cover:

- The list of roles and permission constants
- The one reusable check (dependency or decorator) with a short code excerpt (10 to 20 lines)
- How ownership is enforced in queries (filtering by the owner id, not only checking afterwards)
- How a new role or permission would be added
- The special rules for admins and banned users

*[Diagram: authorisation flow for one request]*
*[Code excerpt: the reusable permission check]*

### C8. Admin Dashboard Design
Describe every admin page, the endpoints it calls, its filters and pagination, its actions, and the audit events each action writes. Explain how bulk actions report how many items were affected and skipped, and how CSV export respects the filters.

*[Diagram: admin pages and the endpoints they call]*
*[Table: page, endpoints, filters, actions, audit events]*

### C9. Security Design and Threats
A table of threats, the defence and where it is in the code. Cover at least: password database leak, stolen access token, stolen refresh token, brute-force login, privilege escalation, access to another user's record, cross-site scripting, cross-site request forgery, CORS misuse, secrets in the repository, SQL injection and over-posting of fields.

*[Table: threat, defence, file or module]*

### C10. Database Migrations and Seed Data
List the migrations in order with one line each, the commands to build the database from scratch, what the seed script creates (admins, users, groups with mixed permissions, sample data) and how to reset the data.

### C11. Deployment on Vercel
Describe the Vercel projects (frontend and API), the build settings and rewrites, how the frontend finds the API, the hosted database, and the names of all environment variables (never the values). Explain how to redeploy.

*[Diagram: deployment layout]*
*[Table: environment variable names and what each is for]*

### C12. Testing
The test strategy (automated API tests, manual tests on the live site), how to run the tests, and a results table: test name, requirement it checks, result. Include the tests for token expiry and tampering, ownership, the group permission matrix, the admin rules and lockout.

*[Table: tests and results]*

## Part D. Evidence: Screenshots of the Running Application
Take every screenshot on the deployed Vercel URL, with the address bar visible and the logged-in user shown. Crop to the relevant area. Give each a number, a caption saying what it proves and the requirement ID. Mask passwords and tokens.

### D1. User Side
Each screenshot below is required:

*[S1: signup and login page, with a validation error shown (for example a weak password)]*
*[S2: the main feature page of a logged-in user, showing only that user's records]*
*[S3: profile page and the change password form, with the wrong current password rejected]*
*[S4: the sessions list with the revoke action]*
*[S5: a group page showing members and their permissions]*
*[S6: an action denied by RBAC, showing the message in the app and the 403 response in the browser network tab]*

### D2. Security Behaviour
Use the browser developer tools:

*[S7: network tab showing the Authorization header (token masked) and an expired token returning 401]*
*[S8: the refresh request returning a new access token, and the httpOnly cookie in the application tab]*
*[S9: a banned user rejected on the next request]*

### D3. Admin Dashboard
Show real data and the matching result of each action:

*[S10: overview statistics]*
*[S11: users list with search, filters and pagination]*
*[S12: user detail with sessions and recent activity]*
*[S13: the ban dialog with a reason, and the banned state afterwards]*
*[S14: records and groups moderation list with filters and a bulk action]*
*[S15: activity log with filters, showing the events caused by the steps above]*
*[S16: security view with failed logins by IP and by account]*
*[S17: a CSV export downloaded and opened]*

### D4. Deployment
Show that it is live and configured:

*[S18: the Vercel frontend project with the production deployment and domain]*
*[S19: the Vercel API project with the environment variable names (values hidden)]*
*[S20: the live API documentation page]*

### D5. Tests
The output of the automated tests:

*[S21: test run output showing all tests and the result]*

## Part E. Project Management and Conclusion

### E1. How to Run, Seed and Test
Step by step: prerequisites, the environment file (variable names with example values), and the commands for the backend, frontend, migrations, seed script and tests. End with how to log in with the seeded accounts. Someone who has never seen the project must be able to follow it.

### E2. GitHub Work
A table of the issues and pull requests for each major feature (JWT, RBAC, admin dashboard and others): link, title and what it delivered. Say which commits are yours and how the work was divided over time.

*[Table: issue, pull request, what it delivered]*

### E3. Limitations
An honest list: what is missing or only partly done, known bugs, and security risks you did not cover. Hiding a problem is worse than reporting it.

### E4. Future Work
What you would build or fix next, in priority order, with one line of reason each.

### E5. Sources, Libraries and Tools
A table of every library, tutorial, document and tool you used (name, version or link, what for). If you used any AI tool, say which one, for which part, and what you checked or changed yourself.

*[Table: sources, libraries and tools]*

## Appendix. Test Accounts and Video Demo
The seeded demo accounts (email and role), where the passwords are written, and the link to the video demo (5 to 8 minutes on the deployed URL).
