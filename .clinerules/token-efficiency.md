
# Chronos — Token Efficiency Rules

## File Inspection Policy

1. Never scan or read the entire repository.
2. Never read files unless they are directly relevant to the current task.
3. Start by identifying the exact component, function, API route, or service involved.
4. Use targeted search to locate relevant code.
5. Read only the necessary sections of files instead of entire large files.
6. Follow dependencies only when the current implementation requires it.
7. Do not repeatedly read files that have not changed.
8. Never inspect node_modules, build outputs, generated files, or lockfiles unless explicitly necessary.
9. Do not read documentation unless it is relevant to the current task.
10. Do not inspect unrelated frontend or backend modules.

## Editing Policy

1. Modify the minimum number of files possible.
2. Avoid unrelated refactoring.
3. Reuse existing components and functions.
4. Do not rewrite entire files for small changes.
5. Preserve existing architecture and functionality.

## Context & Token Management

1. Keep tool outputs short.
2. Avoid printing entire files in the terminal.
3. Filter logs to show only relevant errors.
4. Do not repeatedly summarize the entire project.
5. Maintain a concise understanding of the current task.
6. Before reading another file, determine whether it is actually necessary.

## Investigation Strategy

Follow this sequence:

1. Locate the relevant feature.
2. Identify its direct dependencies.
3. Inspect only the required code.
4. Implement the smallest reliable fix.
5. Run relevant tests.
6. Report modified files and actual results.

IMPORTANT:
Do not sacrifice code quality or correctness to reduce token usage.
