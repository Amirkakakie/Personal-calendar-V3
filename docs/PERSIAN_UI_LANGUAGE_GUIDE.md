# Persian UI language and microcopy guide

This guide keeps Persian labels, actions, field names, and product terminology consistent across Chronos.

## Voice and writing style

- Use clear, contemporary, natural Persian. Prefer short labels and direct instructions.
- Write for the action the user is taking, not as a literal translation of the English source.
- Use consistent half-spaces where appropriate: «می‌شود»، «به‌روزرسانی»، «همگام‌سازی».
- Avoid inflated or overly academic language in everyday controls.
- Keep technical product names and standards when they are the clearest terms (Google Calendar, OAuth, JSON, iCal, OKR, XP).
- Keep placeholders practical and concrete; avoid long fictional technical examples.
- Use the same term in buttons, menus, page headings, dialogs, empty states, and notifications.

## Preferred product glossary

| English concept | Preferred Persian |
| --- | --- |
| Task | کار |
| Tasks | کارها |
| Subtask | کار زیرمجموعه |
| Task list | فهرست کارها |
| Task status: To do | انجام‌نشده |
| In progress | در حال انجام |
| Completed | انجام‌شده |
| Due date | موعد انجام |
| Goal | هدف |
| Key result | نتیجه کلیدی |
| Project | پروژه |
| Workspace | فضای کاری |
| Team member | همکار / عضو تیم (based on context) |
| Kanban board | برد کانبان |
| Card | کارت |
| Backlog | فهرست کارهای آینده |
| Assignee | مسئول انجام |
| Time tracking | ثبت زمان |
| Focus timer | زمان‌سنج تمرکز |
| Coach / AI Coach | راهنمای هوشمند |
| Breakdown / Decompose | تقسیم به گام‌های کوچک‌تر |
| Schedule | زمان‌بندی |
| Filter | فیلتر |
| Search | جستجو |
| Save | ذخیره |
| Cancel | انصراف |
| Delete | حذف |
| Edit | ویرایش |
| Add | افزودن |

## Avoid these translations

- Do not translate Task as «وظیفه» or use the English loanword «تسک» in user-facing Persian.
- Avoid «بورد»; use «برد» for Kanban.
- Avoid «شکست هدف»; use «تقسیم هدف به گام‌های اجرایی».
- Avoid «کوچینگ» in ordinary navigation; use «راهنمای هوشمند» or «گفت‌وگو با راهنمای هوشمند».
- Avoid awkward literal terms such as «رهنمود»، «پرتفوی»، «راندمان» and «تخصیص‌نیافته» when a simpler phrase is clearer.
- Do not call a normal action or task a «اقدام» unless the context genuinely means an action distinct from a task.

## Control and form-label rules

- Buttons start with a clear verb: «افزودن کار»، «ذخیره»، «حذف»، «دعوت همکار».
- Field labels name the value expected: «عنوان کار»، «تاریخ انجام»، «زمان تقریبی انجام»، «مسئول انجام».
- Placeholders provide a short example or instruction and never replace the visible field label.
- Destructive actions use explicit confirmation copy, e.g. «از حذف این کار مطمئن هستید؟».
- Empty states explain what is missing and offer a direct next action.
- Statuses use consistent adjective forms: «انجام‌نشده»، «در حال انجام»، «انجام‌شده».
- Keep Persian and English locale behavior aligned in meaning, not necessarily word-for-word.

## Review checklist

- Check navigation, page titles, buttons, tooltips, form labels, placeholders, validation messages, confirmation dialogs, empty states, toasts, and mobile navigation.
- Check that the Persian copy uses the glossary consistently.
- Preserve interpolation tokens such as `{{count}}`, `{{name}}`, and `{{minutes}}`.
- Preserve technical identifiers and API names exactly.
- Verify RTL layout and mixed Persian/Latin strings after copy changes.
