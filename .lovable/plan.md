# שלב 1 בלבד: הסתרת UUID בהצעות Spark with AI

אישור התוכנית הזו יממש **רק** את שלב 1. שלבים 2 (Make) ו-3 (AI Insights) לא יתחילו בלי אישור נפרד.

## הבעיה

- Spark שולח ל-Make את `connections [{from, to}]` עם UUIDs בלבד, בלי טקסט.
- המודל לפעמים כותב את ה-UUID בתוך טקסט ההצעה, ואנחנו שומרים ומציגים את הטקסט בלי סינון.

## מה ישתנה (Lovable בלבד, קובץ אחד: `src/lib/brainstorm.functions.ts`)

1. **תוספת ל-request**: לכל connection יתווספו `from_text` ו-`to_text`. השדות הקיימים (`from`, `to`, `focus_node`, `existing_nodes`, `request_type: "expand"`) נשארים בדיוק כמו היום, ו-Make שמתעלם משדות לא מוכרים לא יושפע.
2. **סינון התשובה לפני שמירה**: כל UUID בתוך `text` יוחלף בשם ה-node בגרשיים (למשל `"Bees"`). UUID לא מוכר יוסר וינוקו רווחים כפולים.
3. **ה-IDs הפנימיים נשמרים**: `related_node_id` ממשיך ליצור את קו החיבור, ו-`source_node_id`, `from_node` ו-`to_node` נשמרים כמו היום. רק הטקסט שהמשתמש רואה מסונן.
4. פונקציה קטנה `humanizeIds` ובדיקת unit שלה (UUID מוכר מוחלף בשם, UUID לא מוכר מוסר, טקסט רגיל לא משתנה).

## מה לא ישתנה

Make ו-OpenAI, ה-DB, Google sign-in והרשאות, realtime, Notes ו-TODOs, Keep/Dismiss, Undo/Redo, Recently Deleted, ארבעת סוגי ההצעות, הצבעים והמיקום, ושפות ו-RTL.

## בדיקות אחרי המימוש

- הרצת בדיקת ה-unit.
- Spark with AI על node עם חיבורים בתצוגה המקדימה: אף הצעה לא מכילה UUID; הצעות CONNECTION מתחברות ל-node הנכון; מופיעים סוגי idea, question, connection ו-perspective עם הצבעים הרגילים.
- Keep ו-Dismiss עובדים, ואחרי רענון הנתונים נשמרים.

אחרי הבדיקות אעצור ואחכה לאישור שלך לפני שלב 2.
