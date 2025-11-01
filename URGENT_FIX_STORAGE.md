# 🚨 URGENT FIX: Storage Upload Error

## Error Details
```
new row violates row-level security policy for table "objects"
user_name: supabase_storage_admin
sql_state_code: 42501
```

## 🔴 The Problem
Your storage bucket has **RLS (Row Level Security) enabled** but **no policies allow uploads**.

## ✅ IMMEDIATE FIX (Choose One Method)

---

### **METHOD 1: Via Supabase Dashboard (EASIEST) ⭐**

1. Go to your Supabase Dashboard
2. Navigate to: **Storage** → **Policies** → **bill bucket**
3. Click **"New Policy"**
4. Choose **"Custom"**
5. Use these settings:

   **For INSERT (Upload):**
   - Policy name: `Allow all uploads to bill bucket`
   - Target roles: `public`
   - Command: `INSERT`
   - WITH CHECK expression: `bucket_id = 'bill'`

   **For SELECT (View):**
   - Policy name: `Allow all to view bills`
   - Target roles: `public`
   - Command: `SELECT`
   - USING expression: `bucket_id = 'bill'`

6. Click **"Review"** then **"Save Policy"**

---

### **METHOD 2: Via SQL Editor (FASTEST)**

1. Go to: **Supabase Dashboard** → **SQL Editor**
2. Create a **New Query**
3. Paste this SQL:

```sql
-- Allow uploads to bill bucket
CREATE POLICY "Allow all uploads to bill bucket"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'bill');

-- Allow viewing bills
CREATE POLICY "Allow all to view bills"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bill');
```

4. Click **"Run"** (or press F5)
5. You should see: `Success. No rows returned`

---

### **METHOD 3: Disable RLS (NOT RECOMMENDED)**

⚠️ **Only use this for testing, not production!**

1. Go to: **Storage** → **Policies** → **bill bucket**
2. Find **"Enable RLS"** toggle
3. Turn it **OFF**

---

## 🧪 Testing

After applying the fix:

1. Try uploading a bill again
2. Check browser console - you should see:
   ```
   ✅ PDF uploaded successfully
   ✅ Bill saved successfully to database
   ```

3. If it still fails, check **Supabase Dashboard** → **Logs** → **Postgres Logs** for new errors

---

## 🔍 Verify Policies Were Created

Run this in SQL Editor to verify:

```sql
SELECT 
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%bill%';
```

You should see at least 2 policies returned.

---

## ❓ Why This Happened

Your storage bucket has RLS enabled but no policies were created. Without policies:
- ❌ All uploads are blocked
- ❌ Even `supabase_storage_admin` can't bypass RLS

The fix creates policies that allow:
- ✅ Anyone to upload to the `bill` bucket
- ✅ Anyone to view files in the `bill` bucket

---

## 🔒 Security Note

The current fix allows **anyone** to upload to the bill bucket. For production, you should:

1. **Option A:** Add authentication to your uploads
2. **Option B:** Restrict by folder (requires Supabase Auth):
   ```sql
   WITH CHECK (
     bucket_id = 'bill' AND
     (storage.foldername(name))[1] = auth.uid()::text
   )
   ```

But first, **get it working** with the simple policy above!

---

## 🆘 Still Not Working?

If you still get errors after applying the fix:

1. **Check if RLS is enabled on storage.objects:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'storage' AND tablename = 'objects';
   ```

2. **List all policies:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE schemaname = 'storage' AND tablename = 'objects';
   ```

3. **Try recreating the bucket:**
   - Dashboard → Storage → Create new bucket → "bill2"
   - **Make sure "Public bucket" is checked**
   - Update your code to use "bill2" instead of "bill"

---

## 📝 What to Do Next

1. ✅ Apply the fix using **METHOD 1** or **METHOD 2** above
2. ✅ Test uploading a bill
3. ✅ If it works, consider adding proper authentication later
4. ✅ Document which method you used for future reference
