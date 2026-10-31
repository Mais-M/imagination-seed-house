# תוכנית: תיקון UUID בהצעות AI + AI Insights מתוך Notes

## 1. ממצאים טכניים (מבוססים על הקוד)

**איך Spark with AI עובד היום** (`src/lib/brainstorm.functions.ts`):
- server function מאומת (`requireSupabaseAuth`), בודק `can_edit_board`, ושולח ל-`MAKE_WEBHOOK_URL` payload עם `focus_node {id, text}`, `existing_nodes [{id, text, is_ai}]` ו-`connections [{from, to}]` — כלומר רק IDs, ללא labels.
- התשובה נקראת מ-`suggestions[]` עם השדות `type`, `text`, `color`, `related_node_id`. ה-`text` נשמר **כמו שהוא**, בלי שום עיבוד, כ-node עם `status: 'suggested'`.

**איך Notes נשמרים**: טבלת `notes` (`title`, `content`, `kind`, `color`). "Add to mind map" (`toMap` ב-`NotesPanel.tsx`) מעתיק רק את `title` (או 80 התווים הראשונים) — ה-body לא מגיע ל-AI בשום שלב. אין כרגע שום פעולת AI במסך Notes.

## 2. סיבת השורש המשוערת ל-UUID

- **מה מאומת בקוד**: אנחנו שולחים ל-Make את ה-IDs של ה-nodes, וב-`connections` אנחנו שולחים **רק** IDs (`from`/`to`) בלי טקסט. גם אנחנו מבקשים ממנו (דרך החוזה) להחזיר `related_node_id`. לכן המודל "רואה" UUIDs ולפעמים מכניס אותם לטקסט ה-CONNECTION.
- **מה לא מאומת**: את ה-prompt שבתוך Make אי אפשר לבדוק מכאן. ייתכן שהוא גם מבקש במפורש להזכיר את ה-node הקשור. זה צריך בדיקה אצלך ב-Make.
- **אחריות האפליקציה**: גם אם Make מחזיר UUID, הקוד שלנו מציג את הטקסט בלי סינון — כאן אפשר לתקן בבטחה בלי לגעת ב-Make.

## 3. תיקון מינימלי ל-UUID (Lovable בלבד)

1. ב-payload: להוסיף `from_text` / `to_text` ל-`connections` (השדות הקיימים נשארים — תאימות לאחור).
2. בתשובה: לפני השמירה, להחליף כל UUID בטקסט בשם ה-node בגרשיים (למשל `"Bees"`); UUID לא מוכר יוסר. ה-`related_node_id` הפנימי נשמר ומשמש לחיבור כמו היום.
- לא נדרש שינוי ב-Make. אופציונלי: להוסיף ל-prompt ב-Make "never mention IDs, refer to ideas by their text".

## 4. עיצוב AI Insights from Notes

- כפתור חדש **"✨ Insights"** בעורך ה-note (רק ל-`kind = note`, רק למי שיש `canEdit`). תוכן נשלח ל-AI רק בלחיצה מפורשת.
- server function חדש `requestNoteInsights` בקובץ הקיים `brainstorm.functions.ts`: מאמת user, בודק `can_view_board` דרך RLS, טוען את ה-note מה-DB (לא סומך על טקסט מהלקוח), ושולח ל-**אותו** `MAKE_WEBHOOK_URL` עם `request_type: "note_insights"`, `language`, ו-`note {title, content}` (עד ~8,000 תווים) + שמות ה-nodes הקיימים כהקשר.
- תשובה צפויה: אותו פורמט `suggestions[]` עם 2–4 פריטים מסוג idea / question / connection / perspective (ניתן להוסיף `theme` / `gap` שימופו לצבעים קיימים).
- תצוגה: כרטיסי בועות צבעוניים מתחת לעורך, עם תגית סוג. לכל insight: **Add to map** (יוצר node עם `is_ai: true`, `status: 'suggested'` — כך שב-Mind Map עדיין צריך Keep/Dismiss), **Dismiss**, ואפשרות עריכת הטקסט לפני הוספה. אין יצירת TODO אוטומטית.
- ה-insights זמניים (לא נשמרים ב-DB עד ש-"Add to map") — אין שינוי schema.
- שפה: `language` נשלח מה-i18n הנוכחי; כרטיסים עם `dir="auto"`; מחרוזות UI חדשות ב-en/he/ar.
- שגיאות: `not_configured` / `upstream` / תשובה ריקה → toast ידידותי.

## 5. שינויים נדרשים ב-Make (בנפרד, אצלך)

Make אינו נגיש לי, לכן זה דורש אימות:
- להוסיף Router לפי `request_type`: ערך `"note_insights"` → prompt שמנתח את `note.content` ומחזיר 2–4 insights באותו JSON (`suggestions: [{type, text}]`), בשפת `language`. הענף הקיים של Spark נשאר כפי שהוא.
- אם Make כרגע מתעלם מ-`request_type`, הכפתור יחזיר הצעות רגילות שמבוססות על nodes — לכן צריך לבדוק את זה לפני ההדגמה.
- אופציונלי: הוראה לא להזכיר IDs.

## 6. סיכונים

- שינוי ה-payload תואם לאחור (שדות נוספים בלבד) — Spark הקיים לא נפגע.
- סינון UUID עלול להחליף UUID לגיטימי בטקסט — בפועל לא קורה בהצעות יצירתיות.
- ללא עדכון Make, Insights לא יתבססו על ה-body — זה התלות העיקרית.
- אין שינוי בסנכרון realtime, Undo/Redo, Recently Deleted, הרשאות או DB.

## 7. שלבי מימוש

1. `brainstorm.functions.ts`: הוספת `from_text`/`to_text` + פונקציית `humanizeIds` על טקסט ההצעות.
2. `brainstorm.functions.ts`: `requestNoteInsights` חדש.
3. `NotesPanel.tsx`: כפתור Insights, מצב טעינה, כרטיסי insights עם Add to map / Dismiss / edit.
4. `i18n.tsx`: מפתחות חדשים ב-en/he/ar.
5. בדיקת unit קטנה ל-`humanizeIds`.

## 8. צ'קליסט בדיקות

- Spark על node עם חיבורים → אף הצעת CONNECTION לא מכילה UUID; הקו עדיין מחובר ל-node הנכון.
- Keep/Dismiss, Undo/Redo, Recently Deleted עובדים כמו קודם.
- Note עם body ארוך → Insights מחזיר 2–4 כרטיסים שקשורים לתוכן ולא רק לכותרת (אחרי עדכון Make).
- Add to map → bubble מסוג suggested מופיע; לא נוצר TODO.
- Viewer לא רואה את הכפתור, והשרת דוחה אותו.
- בדיקה בעברית ובערבית (RTL ושפת התשובה).
- רענון: נתונים קיימים לא השתנו.
