# Bug Fixes - Round 2

## Date: February 16, 2026

## Bugs Found and Fixed

### 1. ✅ `server.js` - Missing null check after INSERT
**Issue:** After inserting a patient in signup, the code queries for the row but doesn't check if it exists before accessing properties.
**Location:** Line 304-317
**Fix:** Added null check: `if (!row) return res.status(500).json({ message: "Failed to retrieve created patient" });`

### 2. ✅ `server.js` - Missing null check after UPDATE
**Issue:** After updating patient profile, the code queries for the row but doesn't check if it exists before accessing properties.
**Location:** Line 401-413
**Fix:** Added null check: `if (!row) return res.status(404).json({ message: "Profile not found after update" });`

### 3. ✅ `middleware/audit.js` - Using console.error instead of logger
**Issue:** Audit logging uses `console.error` instead of the logger utility.
**Location:** Line 23
**Fix:** Replaced `console.error` with logger: `logger.error("Audit log failed", { error: error.message, action, resource });`

### 4. ✅ `server.js` - Incorrect array access in doctor profile
**Issue:** After destructuring `const [assistants] = await query(...)`, the code accesses `assistants[0]?.c` but `assistants` is already the first row object, not an array.
**Location:** Line 499
**Fix:** Changed `assistants[0]?.c` to `assistants?.c`

### 5. ✅ `server.js` - Incorrect array access in doctor dashboard
**Issue:** Same pattern - accessing `[0]` on already destructured query results.
**Location:** Line 508-509
**Fix:** Changed `patients[0]?.c` and `assistants[0]?.c` to `patients?.c` and `assistants?.c`

### 6. ✅ `server.js` - Incorrect array access in assistant dashboard
**Issue:** Same pattern - accessing `[0]` on already destructured query results.
**Location:** Line 580
**Fix:** Changed `patients[0]?.c` to `patients?.c`

### 7. ✅ `routes/enterprise.js` - Incorrect array access in analytics
**Issue:** Same pattern - accessing `[0]` on already destructured query results.
**Location:** Line 168-171
**Fix:** Changed `patients[0]?.c`, `doctors[0]?.c`, `appts[0]?.c`, `revenue[0]?.t` to `patients?.c`, `doctors?.c`, `appts?.c`, `revenue?.t`

## Summary

### Total Bugs Fixed: 7

1. **Missing null checks:** 2 instances (after INSERT and UPDATE)
2. **Incorrect array access:** 5 instances (accessing `[0]` on already destructured objects)
3. **Logging inconsistency:** 1 instance (console.error → logger)

### Impact

- ✅ Prevents potential runtime errors when database queries return unexpected results
- ✅ Consistent error handling and logging throughout the application
- ✅ Correct property access patterns for query results

### Pattern Explanation

When using `const [row] = await query(...)`, the destructuring extracts the first element from the array returned by `query()`. So:
- `row` is already the first row object (e.g., `{c: 5}`)
- `row[0]` is incorrect (trying to access index 0 of an object)
- `row?.c` is correct (accessing the `c` property)

## Status

✅ **All Bugs Fixed**
- Null checks added where needed
- Array access patterns corrected
- Logging made consistent

The application is now more robust with proper null checks and correct query result handling.
