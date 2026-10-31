# תוכנית בשלבים: תיקון UUID + AI Insights from Notes

כל שלב יאושר בנפרד. אף שלב לא משנה את ה-DB, ואף שלב ב-Lovable לא משנה את Make.

## ממצאים בקצרה

- Spark שולח ל-`MAKE_WEBHOOK_URL` את `focus_node {id, text}`, `existing_nodes [{id, text, is_ai}]`, `connections [{from, to}]` — ב-connections יש רק UUIDs, בלי טקסט.
- טקסט ההצעה מ-Make נשמר כמו שהוא, בלי סינון. לכן UUID שהמודל כותב בטקסט מוצג למשתמש.
- את ה-prompt ב-Make אני לא יכולה לראות; צריך לבדוק שם אם הוא מבקש להזכיר את ה-node הקשור.
- ה-body של note אף פעם לא נשלח ל-AI; "Add to map" מעתיק רק את הכותרת.

---

## שלב 1 — Lovable בלבד, בלי שינוי ב-Make (תיקון UUID)

בטוח לבד, כי מוסיף רק שדות ועיבוד אחרי התשובה.

1. **Request** — שדות קיימים נשארים כמו שהם; נוספים שדות שאפשר להתעלם מהם:
   - `connections[]`: `{from, to}` (קיים) + `from_text`, `to_text` (חדש).
2. **Response** — אותו חוזה בדיוק: `suggestions[] {type, text, color?, related_node_id? | related_node?}`.
3. **סינון לפני שמירה**: כל UUID בתוך `text` יוחלף בשם ה-node בגרשיים (`"Bees"`); UUID לא מוכר יוסר וינוקו רווחים מיותרים.
4. **UUIDs פנימיים נשארים**: `related_node_id` עדיין משמש ליצירת החיבור, ו-`source_node_id`, `from_node` ו-`to_node` נשמרים כמו היום. רק הטקסט שהמשתמש רואה מסונן.
5. בדיקת unit ל-`humanizeIds`.

**למה Spark ממשיך לעבוד**: אותו URL, אותו `request_type: "expand"`, אותם שדות; Make שמתעלם משדות לא מוכרים לא מושפע.

---

## שלב 2 — Make בלבד (מתבצע על ידך, לפני שלב 3)

Lovable לא נוגע בזה. מומלץ לשכפל את ה-scenario לגיבוי לפני השינוי.

1. להוסיף **Router** אחרי ה-Webhook:
   - נתיב A: `request_type` שונה מ-`note_insights` (כולל `expand` וריק) → **הזרימה הקיימת, בלי שינוי**. זה הנתיב שמוגדר כ-fallback.
   - נתיב B: `request_type = note_insights` → מודול OpenAI חדש עם prompt שמנתח את `note.content`.
2. התשובה בנתיב B — אותו פורמט:
   `{"suggestions":[{"type":"idea|question|connection|perspective","text":"..."}]}` עם 2–4 פריטים, בשפה שב-`language`, בלי IDs.
3. אופציונלי בנתיב A: להוסיף ל-prompt "Refer to ideas by their text, never by ID".
4. **בדיקה ב-Make לפני שלב 3**: לשלוח בקשת `expand` רגילה ולוודא שהתשובה זהה לקודם; לשלוח בקשת `note_insights` לדוגמה (אתן לך JSON מוכן) ולוודא שחוזרים 2–4 insights.

**דברים שצריך לבדוק אצלך**: האם יש כבר מסנן על `request_type`, ואיזה שדות ה-prompt קורא היום.

---

## שלב 3 — Lovable, אחרי ששלב 2 נבדק (AI Insights)

1. **server function חדש** `requestNoteInsights` (לא משנה את `requestBrainstorm`):
   - מאמת user ובודק `can_edit_board` (viewer נדחה בשרת).
   - קורא את ה-note מה-DB לפי `noteId` (לא סומך על טקסט מהלקוח) ומוודא שהוא שייך לאותו board.
   - שולח ל-אותו `MAKE_WEBHOOK_URL`:
     - `request_id`, `user_id`, `board_id`, `language`, `request_type: "note_insights"`
     - `note: {title, content}` — ה-**body המלא**, עד ~8,000 תווים
     - `existing_ideas: [text]` — רק טקסטים, בלי IDs
   - מסנן UUID ומגביל ל-4 insights; **לא שומר כלום ב-DB**.
2. **ממשק ב-NotesPanel**: כפתור "✨ Insights" בעורך note (רק `kind = note`, רק עם הרשאת עריכה). שום דבר לא נשלח בלי לחיצה.
3. כרטיסי insights צבעוניים לפי סוג, עם `dir="auto"`. לכל כרטיס: **עריכה**, **Dismiss**, **Add to map** — יוצר bubble עם `status: 'suggested'`, כך שעדיין צריך Keep/Dismiss במפה. אין TODO אוטומטי.
4. מחרוזות UI חדשות ב-en/he/ar; הודעות שגיאה ידידותיות (`not_configured`, `upstream`, תשובה ריקה).
5. **הגנה**: אם Make עדיין לא עודכן ומחזיר הצעות רגילות, הן יוצגו כ-insights בלבד ולא ישפיעו על Spark.

---

## סיכונים

- שלב 1: מוסיף שדות בלבד, אז הסיכון נמוך. החלפת UUID נוגעת רק למחרוזות בפורמט UUID.
- שלב 2: עיקר הסיכון נמצא ב-Router. ה-fallback לנתיב הקיים והגיבוי מצמצמים אותו.
- שלב 3: קוד חדש ונפרד, בלי שינוי ב-realtime, Undo/Redo, Recently Deleted, הרשאות או DB.

## צ'קליסט בדיקות

- **אחרי שלב 1**: Spark על node עם חיבורים → אין UUID בטקסט, והקו מחובר ל-node הנכון; Keep/Dismiss ו-Undo עובדים.
- **אחרי שלב 2**: בקשת `expand` מחזירה את מה שחזר קודם; בקשת `note_insights` מחזירה 2–4 פריטים.
- **אחרי שלב 3**: note עם body ארוך → insights שקשורים לתוכן ולא לכותרת; Add to map → bubble מסוג suggested; viewer לא יכול; עברית וערבית (RTL ושפת התשובה); Spark עדיין עובד; רענון לא משנה נתונים קיימים.
