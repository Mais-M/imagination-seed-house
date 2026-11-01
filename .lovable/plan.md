# תוכנית: פעולת "Insights" אופציונלית ל-Notes (תוכנית בלבד)

אישור התוכנית הזו לא יפעיל שום שינוי ב-Make. כל שלב למטה דורש אישור נפרד.

## עיקרון מרכזי: הפרדה מלאה מ-Spark with AI

- Spark with AI ממשיך להשתמש ב-secret הקיים `MAKE_WEBHOOK_URL` ובקובץ `src/lib/brainstorm.functions.ts`. שני הדברים לא משתנים בכלל.
- Insights מקבל secret חדש ונפרד, `MAKE_INSIGHTS_WEBHOOK_URL`, שמצביע על ה-webhook של סצנריו ה-COPY בלבד.
- יש server function חדש ונפרד: `src/lib/insights.functions.ts`.
- לכן route ה-`expand` לא יכול להישבר: הוא לא נוגע בקוד, ב-URL או ב-payload של Insights. אם Insights נכשל, Spark ממשיך לעבוד.

## שלב A: חיבור ובדיקה של סצנריו ה-COPY (בלי שינוי קוד באפליקציה)

1. את מפעילה את ה-COPY ב-Make במצב "Run once", או מעבירה אותו ל-Active זמנית. הסצנריו המקורי לא נוגע.
2. מוסיפים את ה-secret `MAKE_INSIGHTS_WEBHOOK_URL` עם כתובת ה-webhook של ה-COPY. אבקש את הערך דרך חלון ה-secret המאובטח.
3. בדיקה מבודדת: קריאה ישירה ל-webhook עם payload לדוגמה בשלוש השפות. מוודאים שהתשובה היא `{ "suggestions": [{ "type", "text" }] }` עם ארבעת הסוגים.
4. אם מבנה התשובה שונה מזה, אעצור ואתאר את ההבדל לפני שאכתוב קוד.

## שלב B: Lovable, כשה-COPY כבר עובד

**Server function** `requestNoteInsights` (`requireSupabaseAuth`):
- Input: `boardId`, `noteId`, `language`.
- בודק `can_edit_board`, וקורא את ה-note מהשרת: title, content, ובמקרה של TODO גם טקסט הפריטים. לא סומכים על טקסט שמגיע מהדפדפן.
- שולח ל-Make: `request_type: "note_insights"`, `language`, `note_title`, `note_body` (התוכן המלא, עם תקרה של 8000 תווים).
- מסנן את התשובה: עד 4–8 הצעות, ה-type מנורמל ל-idea/question/connection/perspective, ומפעיל `humanizeIds` ליתר ביטחון.
- **לא כותב כלום ל-DB.** הוא רק מחזיר את ההצעות.

**UI ב-NotesPanel**:
- כפתור "Insights" ליד "Add to mind map", רק למי שיש לו הרשאת עריכה.
- פאנל שמציג כרטיסי הצעה בצבעי הסוג הקיימים (lime/sky/lilac/peach). כל כרטיס כולל:
  - **עריכה:** הטקסט ניתן לעריכה לפני הוספה.
  - **Dismiss:** מסיר את הכרטיס מהמסך בלבד.
  - **Add to mind map:** יוצר bubble אחד, ורק בלחיצה מפורשת.
- ההצעות שמורות ב-state מקומי בלבד. רענון מוחק אותן, ושום דבר לא נשמר בלי פעולה שלך.

**הוספה למפה**: אותו insert שקיים היום ב-`toMap`: `status: "accepted"`, `is_ai: true`, `ai_type` לפי הסוג, צבע הסוג, ו-`note_id` לקישור ל-note. המיקום אקראי ליד המרכז, כך שהתזוזה העצמאית של bubbles נשמרת. Realtime מעדכן את המשתתפים האחרים כרגיל.

**שפות**: מפתחות i18n חדשים ב-en/he/ar (insights, analyzing, addToMap, dismiss, insightsError, noInsights). כרטיסי ההצעות משתמשים ב-`dir="auto"`, כך שעברית וערבית מוצגות נכון.

## מה לא ישתנה

Spark with AI ו-`MAKE_WEBHOOK_URL`, הסצנריו המקורי ב-Make, מבנה ה-DB וה-RLS, Google sign-in, realtime, תוכן ה-notes וה-TODOs (Insights לא כותב אליהם), Undo/Redo ו-Recently Deleted.

## בדיקות אחרי שלב B

- בדיקת unit לנרמול התשובה: סוג לא מוכר הופך ל-idea, טקסט ריק מסונן, UUID מוסר.
- בתצוגה המקדימה: Insights על note ארוך שהמידע החשוב בו נמצא רק בגוף ולא בכותרת. ההצעות צריכות להתייחס לגוף.
- עריכה, Dismiss ו-Add: נוצר bubble צבעוני, ה-note לא השתנה, והנתונים נשמרים אחרי רענון.
- Spark with AI על node רגיל עדיין עובד כמו קודם.
- בדיקה בעברית ובערבית.

## שלב C (אופציונלי, באישור נפרד)

רק אחרי שהכול יציב: להחליט אם להשאיר את ה-COPY כסצנריו קבוע ל-Insights (מומלץ, כי זה הכי בטוח), או למזג את ה-route לסצנריו המקורי. מיזוג כזה ידרוש בדיקה חוזרת של expand.
