# reference/kaybykhushie PROJECT REFERENCE RULES

## Purpose

Use the existing `reference/kaybykhushie` project as the **primary and exact reference** for implementing this project.

Before creating, modifying, restructuring, configuring, or deciding anything, first inspect the `reference/kaybykhushie` folder and determine how the corresponding functionality is implemented there.

## Mandatory Rule

**Follow the `reference/kaybykhushie` project exactly wherever a corresponding implementation already exists.**

This includes, but is not limited to:

- Project structure
- Folder structure
- File organization
- Naming conventions
- Prisma setup
- Prisma schema and database patterns
- Database models and relations
- Migrations
- API structure
- Backend architecture
- Authentication and authorization
- Validation
- Error handling
- Environment-variable usage
- Configuration
- Utilities/helpers
- Services
- Controllers/routes
- Middleware
- Response formats
- Frontend/backend communication
- Reusable components
- State/data handling
- Dependency choices
- Scripts and commands
- Coding patterns
- Existing conventions

Do **not** replace an existing `reference/kaybykhushie` pattern with your own preferred approach when the reference project already provides a working pattern.

## Before Making Any Changes

1. Find and inspect the `reference/kaybykhushie` folder.
2. Understand its relevant structure and implementation.
3. Identify the equivalent feature, configuration, or pattern needed in the current project.
4. Replicate the existing approach as closely as possible.
5. Keep naming, structure, dependencies, Prisma conventions, and implementation patterns consistent with `reference/kaybykhushie`.

## Missing Reference Rule — IMPORTANT

If something required for the current project **does not exist in `reference/kaybykhushie`**, **STOP before implementing it**.

Do NOT:

- Guess
- Invent a new architecture
- Choose a library yourself
- Choose a database pattern yourself
- Create a new folder structure yourself
- Make assumptions about how it should work
- Silently use a different implementation

Instead, clearly ask:

> "This requirement does not exist in `reference/kaybykhushie`: [describe exactly what is missing]. How would you like me to implement it?"

Then **wait for my answer**.

Only after I provide the required direction should you implement the missing part.

## Prisma / Database Rule

The existing Prisma implementation in `reference/kaybykhushie` is the source of truth.

Before changing or creating anything related to the database:

1. Inspect the existing Prisma structure in `reference/kaybykhushie`.
2. Inspect `schema.prisma`.
3. Inspect existing models and relations.
4. Inspect migrations.
5. Inspect Prisma configuration and database connection handling.
6. Follow the same approach in this project.

Do not introduce a different ORM, database pattern, migration strategy, or Prisma architecture if the corresponding implementation already exists in `reference/kaybykhushie`.

## Environment Variables

Follow the same environment-variable naming and configuration pattern used by `reference/kaybykhushie`.

Never expose secrets in source code.

If a required environment variable or configuration is missing from `reference/kaybykhushie`, ask me before deciding how to handle it.

## Dependency Rule

If `reference/kaybykhushie` already uses a package/library for a requirement, use the same package and compatible approach unless there is a clear technical reason it cannot be used.

If a required dependency is not present in `reference/kaybykhushie`, ask me before introducing a new dependency.

## Conflict Rule

If the current project structure conflicts with the structure used by `reference/kaybykhushie`:

1. Identify the difference.
2. Explain what is different.
3. Ask me what I want to do.
4. Do not automatically restructure or overwrite anything.

## No Silent Decisions

When the reference project does not provide enough information, stop and ask.

The priority is:

1. **Existing implementation in `reference/kaybykhushie`**
2. **My explicit instructions**
3. **Only if neither provides an answer: ask me**

Do not use personal preference or assumptions as a substitute for missing requirements.

## Final Principle

Treat `reference/kaybykhushie` as the **reference implementation / source of truth** for this project.

**If it exists there, follow it.  
If it does not exist there, ask me first.  
Do not guess.**
  