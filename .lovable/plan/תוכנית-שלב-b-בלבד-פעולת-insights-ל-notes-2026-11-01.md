# תוכנית: שלב B בלבד, פעולת "Insights" ל-Notes

אישור התוכנית הזו מאשר את שלב B בלבד. שלב C לא ימומש. הסצנריו המקורי ב-Make וה-webhook שלו לא ישתנו.

## הפרדה מוחלטת מ-Spark with AI

- Spark with AI ממשיך להשתמש ב-`MAKE_WEBHOOK_URL` וב-`src/lib/brainstorm.functions.ts`. שניהם לא משתנים.
- Insights משתמש ב-secret חדש, `MAKE_INSIGHTS_WEBHOOK_URL`, שמצביע רק על ה-webhook של ה-COPY. אבקש את הערך דרך חלון ה-secret המאובטח.
- Insights מקבל server function נפרד: `src/lib/insights.functions.ts`. אין שום קוד משותף עם route ה-`expand`, חוץ מהפונקציה `humanizeIds` שקוראת בלבד.

## מה ייבנה

**Server function `requestNoteInsights`** (`requireSupabaseAuth`, ההרשאות נאכפות דרך RLS):
- מקבל: `boardId`, `noteId`, `language`.
- בודק `can_edit_board`. בלי הרשאה, מוחזרת שגיאה.
- קורא את ה-note מה-DB בשרת, ולא מהדפדפן: title ו-content המלא. ב-note מסוג TODO, גוף ה-note הוא טקסט כל הפריטים.
- note בלי גוף לא נשלח, ומוצגת הודעה "אין תוכן לניתוח". כך לעולם לא מנתחים רק כותרת.
- שולח ל-COPY: `request_type: "note_insights"`, `language`, `note_title`, `note_body` (עד 8000 תווים).
- מנרמל את התשובה: עד 8 הצעות, ה-type מנורמל ל-idea/question/connection/perspective, טקסט ריק מסונן, ומפעיל `humanizeIds`.
- **לא כותב כלום ל-DB.**
- אם ה-secret חסר, מוחזרת השגיאה `not_configured`.

**UI ב-NotesPanel:**
- כפתור "Insights" ליד "Add to mind map", רק למשתמש עם הרשאת עריכה.
- כרטיסי הצעה בצבעי הסוג הקיימים, עם `dir="auto"` כדי לתמוך ב-RTL.
- בכל כרטיס:
  - **עריכה:** עריכת הטקסט במקום.
  - **Dismiss:** מסיר את הכרטיס מהמסך בלבד.
  - **Add to mind map:** בלחיצה מפורשת בלבד.
- ההצעות נשמרות ב-state מקומי בלבד, ונעלמות ברענון. ה-note עצמו לא משתנה אף פעם.

**Add to mind map:** insert של node אחד, כמו `toMap` הקיים: `status: "accepted"`, `is_ai: true`, `ai_type`, צבע הסוג, `note_id` ומיקום אקראי. ה-bubble זז באופן עצמאי, Undo ו-Recently Deleted עובדים עליו, ו-Realtime מעדכן את השותפים.

**שפות:** מפתחות i18n חדשים ב-en/he/ar.

## הגנה על משתמשי production

- הקוד יופיע רק בתצוגה המקדימה. **לא אפרסם (Publish) את האפליקציה** עד שתאשרי שהבדיקות עברו. האתר שפורסם ממשיך להריץ את הגרסה הנוכחית, בלי Insights.
- כפתור Insights מוסתר כש-`MAKE_INSIGHTS_WEBHOOK_URL` לא מוגדר. כך גם אם יהיה פרסום מוקדם בטעות, הפיצ'ר לא יעבוד בלי ה-secret.
- שימי לב: ה-DB משותף לתצוגה המקדימה ולאתר שפורסם. לכן הבדיקות ייעשו על board בדיקה ייעודי.

## חלון בדיקה עם ה-COPY פעיל זמנית

1. אני מממשת את הקוד ומריצה בדיקות unit לנרמול. בשלב הזה אין קריאות ל-Make.
2. את מוסיפה את `MAKE_INSIGHTS_WEBHOOK_URL`.
3. את מעבירה את ה-COPY ל-Active, או משתמשת ב-"Run once". הסצנריו המקורי לא נוגע.
4. בדיקות בתצוגה המקדימה, על board בדיקה:
   - note ארוך שהמידע החשוב בו נמצא רק בגוף: ההצעות מתייחסות לגוף.
   - עריכה, Dismiss ו-Add: נוצר bubble צבעוני, וה-note לא השתנה.
   - רענון: ה-bubble נשמר.
   - בדיקה בעברית ובערבית.
   - Spark with AI על node רגיל עדיין עובד כמו קודם.
5. את מחזירה את ה-COPY ל-Inactive. אחר כך אני מוודאת שכשה-COPY כבוי, Insights מציג הודעת שגיאה ידידותית, Spark ממשיך לעבוד, ושום דבר לא נכתב.
6. אני עוצרת ומדווחת. פרסום יקרה רק באישור נפרד שלך.

## מה לא ישתנה

הסצנריו המקורי ב-Make, `MAKE_WEBHOOK_URL`, Spark with AI, מבנה ה-DB וה-RLS, Google sign-in, realtime, תוכן ה-notes וה-TODOs, Undo/Redo, Recently Deleted והתזוזה העצמאית של bubbles.
