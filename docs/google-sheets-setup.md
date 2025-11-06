# Google Sheets Setup Guide

## Sheet Structure

Your Google Sheet needs two tabs:

### 1. Entries Tab

**Column headers (Row 1):**
| A | B | C | D | E |
|---|---|---|---|---|
| Project | Start Time | End Time | Duration | Task Notes |

**Duration formula in D2** (copy down):
```
=IF(C2="", "", (C2-B2)*24)
```

This calculates hours between start and end time.

### 2. Monthly Summary Tab

**Total hours per project (current month):**

In cell A1:
```
=QUERY(Entries!A:E, "SELECT A, SUM(D) WHERE B >= date '"&TEXT(TODAY(),"yyyy-mm")&"-01' AND C <> '' GROUP BY A LABEL SUM(D) 'Hours'", 1)
```

**Running monthly total:**

In a cell below the query (e.g., A10):
```
Total Hours This Month:
```

In B10:
```
=SUM(FILTER(Entries!D:D, MONTH(Entries!B:B) = MONTH(TODAY()), YEAR(Entries!B:B) = YEAR(TODAY()), Entries!C:C <> ""))
```

## Service Account Access

1. Open your Google Sheet
2. Click "Share" in top right
3. Add the service account email: `your-service-account@your-project.iam.gserviceaccount.com`
4. Grant "Editor" permissions
5. Click "Send" (uncheck "Notify people")

## Testing

After setup, you should have:
- Header row in Entries tab
- Duration formula in column D
- Monthly Summary tab with formulas
- Service account has editor access

Test by manually adding a row to Entries:
- Project: "Test"
- Start Time: `=NOW()-1/24` (1 hour ago)
- End Time: `=NOW()`
- Duration: Should auto-calculate
- Task Notes: "Manual test"

Verify Monthly Summary updates with the test data.
