# Bilty Image Upload — React Native Implementation Guide

> How the `bilty_image` column works with the **`bilty`** storage bucket in MoveSure, and how to replicate it in React Native.

---

## 📋 Overview

Both bilty tables store an image URL in the `bilty_image` column. All images go to a **single public Supabase storage bucket** called **`bilty`**.

| Bilty Type | DB Table | Storage Bucket | `bilty_image` column |
|------------|----------|----------------|----------------------|
| **Regular Bilty** | `bilty` | `bilty` | Full public URL |
| **Station (Manual) Bilty** | `station_bilty_summary` | `bilty` | Full public URL |

**Supabase Project URL:** `https://xfzrzlnhdyzslhzurxce.supabase.co`

**Example stored URL:**
```
https://xfzrzlnhdyzslhzurxce.supabase.co/storage/v1/object/public/bilty/bilty-images/20107_1772314852563.jpg
```

**URL breakdown:**
```
https://xfzrzlnhdyzslhzurxce.supabase.co   ← Supabase project
/storage/v1/object/public/                   ← public storage path
bilty/                                       ← bucket name
bilty-images/                                ← folder inside bucket
20107_1772314852563.jpg                      ← {gr_no}_{timestamp}.{ext}
```

---

## 🗄️ Database Schema

### `bilty` table (Regular Bilty)
```
id              UUID (PK)
gr_no           TEXT (unique)        ← used in filename
bilty_image     TEXT (nullable)      ← stores full public URL
consignor_name  TEXT
consignee_name  TEXT
no_of_pkg       INTEGER
wt              DECIMAL
total           DECIMAL
to_city_id      UUID (FK → cities)
payment_mode    TEXT
is_active       BOOLEAN
```

### `station_bilty_summary` table (Station/Manual Bilty)
```
id              UUID (PK)
gr_no           TEXT (unique)        ← used in filename
station         TEXT                 ← city code (identifies station bilty)
bilty_image     TEXT (nullable)      ← stores full public URL
consignor       TEXT
consignee       TEXT
no_of_packets   INTEGER
weight          DECIMAL
amount          DECIMAL
w_name          TEXT
payment_status  TEXT
```

---

## 🪣 Storage Bucket Details

| Property | Value |
|----------|-------|
| **Bucket name** | `bilty` |
| **Visibility** | Public |
| **Folder** | `bilty-images/` |
| **File naming** | `{gr_no}_{timestamp}.{extension}` |
| **Example** | `bilty-images/20107_1772314852563.jpg` |
| **Max file size** | 10 MB |
| **Accepted types** | JPG, PNG, GIF, WebP |

---

## 🔄 Complete Upload Flow (Web App — How It Works Now)

The web app uses browser `File` objects directly:

### Step 1: User picks a file
```javascript
// Browser gives a File object from <input type="file">
const file = e.target.files[0];
```

### Step 2: Validate
```javascript
if (!file.type.startsWith('image/')) return alert('Invalid image');
if (file.size > 10 * 1024 * 1024) return alert('Max 10MB');
```

### Step 3: Generate file path
```javascript
const fileExt = file.name.split('.').pop();        // "jpg"
const timestamp = Date.now();                       // 1772314852563
const fileName = `${bilty.gr_no}_${timestamp}.${fileExt}`;  // "20107_1772314852563.jpg"
const filePath = `bilty-images/${fileName}`;        // "bilty-images/20107_1772314852563.jpg"
```

### Step 4: Upload file to `bilty` bucket
```javascript
const { data, error } = await supabase.storage
  .from('bilty')                       // ← bucket name
  .upload(filePath, file, {
    contentType: file.type,            // "image/jpeg"
    upsert: true                       // overwrite if exists
  });
```

### Step 5: Get public URL
```javascript
const { data: urlData } = supabase.storage
  .from('bilty')
  .getPublicUrl(filePath);

const publicUrl = urlData.publicUrl;
// → "https://xfzrzlnhdyzslhzurxce.supabase.co/storage/v1/object/public/bilty/bilty-images/20107_1772314852563.jpg"
```

### Step 6: Save URL to database
```javascript
// For station bilty → station_bilty_summary table
// For regular bilty → bilty table
const tableName = bilty.station ? 'station_bilty_summary' : 'bilty';

const { error } = await supabase
  .from(tableName)
  .update({ bilty_image: publicUrl })
  .eq('id', bilty.id);
```

---

## 🗑️ Remove Image Flow

### Step 1: Extract file path from stored URL
```javascript
const imageUrl = bilty.bilty_image;
// "https://xfzrzlnhdyzslhzurxce.supabase.co/storage/v1/object/public/bilty/bilty-images/20107_1772314852563.jpg"

const urlParts = imageUrl.split('bilty/');
// urlParts[1] = "bilty-images/20107_1772314852563.jpg"
const filePath = urlParts[urlParts.length - 1];
```

### Step 2: Delete from storage
```javascript
await supabase.storage.from('bilty').remove([filePath]);
```

### Step 3: Set `bilty_image` to null in DB
```javascript
const tableName = bilty.station ? 'station_bilty_summary' : 'bilty';
await supabase.from(tableName).update({ bilty_image: null }).eq('id', bilty.id);
```

---

## 📱 React Native Implementation

> In React Native there are no browser `File` objects. Instead, we use `fetch()` to convert the local image URI into a **Blob**, then pass that Blob directly to Supabase. **No base64 conversion needed.**

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js

# Pick ONE image picker:
npm install react-native-image-picker     # bare React Native
# OR
npx expo install expo-image-picker         # Expo
```

### 2. Supabase Client Setup
```javascript
// utils/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xfzrzlnhdyzslhzurxce.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 3. Pick Image — Expo
```javascript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Gallery permission is required.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled) return null;
  return result.assets[0]; // { uri, type, fileSize, fileName, width, height }
};
```

### 4. Pick Image — react-native-image-picker
```javascript
import { launchImageLibrary } from 'react-native-image-picker';

const pickImage = () => {
  return new Promise((resolve) => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, maxWidth: 2000, maxHeight: 2000 },
      (response) => {
        if (response.didCancel || response.errorCode) resolve(null);
        else resolve(response.assets[0]); // { uri, type, fileName, fileSize }
      }
    );
  });
};
```

### 5. Upload Function (Using Blob — No Base64)
```javascript
import { supabase } from '../utils/supabase';
import { Alert } from 'react-native';

/**
 * Upload bilty image to Supabase "bilty" bucket and update DB.
 *
 * @param {Object}  bilty          - must have { id, gr_no, station? }
 * @param {Object}  image          - from image picker { uri, type, fileSize }
 * @returns {string|null}           - public URL on success, null on failure
 */
export const uploadBiltyImage = async (bilty, image) => {
  try {
    // ---- Validate ----
    if (image.fileSize && image.fileSize > 10 * 1024 * 1024) {
      Alert.alert('Error', 'Image size should be less than 10MB');
      return null;
    }

    // ---- Generate file path ----
    const fileExt = image.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const filePath = `bilty-images/${bilty.gr_no}_${timestamp}.${fileExt}`;

    // ---- Convert local URI → Blob (NO base64 needed) ----
    const response = await fetch(image.uri);
    const blob = await response.blob();

    // ---- Upload to "bilty" bucket ----
    const { error: uploadError } = await supabase.storage
      .from('bilty')
      .upload(filePath, blob, {
        contentType: image.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // ---- Get public URL ----
    const { data: urlData } = supabase.storage
      .from('bilty')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    // → "https://xfzrzlnhdyzslhzurxce.supabase.co/storage/v1/object/public/bilty/bilty-images/20107_1772314852563.jpg"

    // ---- Update database ----
    const tableName = bilty.station ? 'station_bilty_summary' : 'bilty';

    const { error: dbError } = await supabase
      .from(tableName)
      .update({ bilty_image: publicUrl })
      .eq('id', bilty.id);

    if (dbError) throw new Error(`DB update failed: ${dbError.message}`);

    return publicUrl;

  } catch (error) {
    console.error('Upload error:', error);
    Alert.alert('Error', error.message);
    return null;
  }
};
```

### 6. Remove Image Function
```javascript
export const removeBiltyImage = async (bilty) => {
  try {
    const currentUrl = bilty.bilty_image;

    // Delete from "bilty" bucket
    if (currentUrl && currentUrl.includes('/bilty/bilty-images/')) {
      // Extract: "bilty-images/20107_1772314852563.jpg"
      const parts = currentUrl.split('/bilty/');
      const filePath = parts[parts.length - 1]; // "bilty-images/20107_1772314852563.jpg"
      await supabase.storage.from('bilty').remove([filePath]);
    }

    // Set bilty_image = null in DB
    const tableName = bilty.station ? 'station_bilty_summary' : 'bilty';
    const { error } = await supabase
      .from(tableName)
      .update({ bilty_image: null })
      .eq('id', bilty.id);

    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    console.error('Remove error:', error);
    Alert.alert('Error', error.message);
    return false;
  }
};
```

### 7. React Native Screen Component
```jsx
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { uploadBiltyImage, removeBiltyImage } from '../utils/biltyImageUpload';

export default function BiltyImageScreen({ bilty, onImageUpdate }) {
  const [imageUrl, setImageUrl] = useState(bilty.bilty_image);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    const image = await pickImage(); // from section 3 or 4 above
    if (!image) return;

    setUploading(true);
    const url = await uploadBiltyImage(bilty, image);
    if (url) {
      setImageUrl(url);
      onImageUpdate?.(bilty.gr_no, url);
      Alert.alert('Success', 'Image uploaded!');
    }
    setUploading(false);
  };

  const handleRemove = () => {
    Alert.alert('Confirm', 'Remove this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploading(true);
          const ok = await removeBiltyImage(bilty);
          if (ok) {
            setImageUrl(null);
            onImageUpdate?.(bilty.gr_no, null);
            Alert.alert('Success', 'Image removed!');
          }
          setUploading(false);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bilty Image — {bilty.gr_no}</Text>

      {imageUrl ? (
        <View style={styles.imageBox}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No image uploaded</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.disabledBtn]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{imageUrl ? 'Replace Image' : 'Upload Image'}</Text>
          )}
        </TouchableOpacity>

        {imageUrl && !uploading && (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
            <Text style={styles.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1e293b' },
  imageBox: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#a78bfa',
    borderRadius: 12, padding: 8, backgroundColor: '#f5f3ff', marginBottom: 16,
  },
  image: { width: '100%', height: 300, borderRadius: 8 },
  placeholder: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#cbd5e1',
    borderRadius: 12, padding: 40, alignItems: 'center', backgroundColor: '#f8fafc', marginBottom: 16,
  },
  placeholderText: { color: '#94a3b8', fontSize: 14 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  uploadBtn: {
    flex: 1, backgroundColor: '#7c3aed', paddingVertical: 14,
    borderRadius: 10, alignItems: 'center',
  },
  disabledBtn: { backgroundColor: '#a5b4fc' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  removeBtn: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fee2e2', borderRadius: 10, alignItems: 'center',
  },
  removeBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
});
```

### 8. Camera Option (Bonus — Expo)
```javascript
import * as ImagePicker from 'expo-image-picker';

const takePhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Camera permission is required.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    allowsEditing: true,
  });

  if (result.canceled) return null;
  return result.assets[0]; // same shape as pickImage, pass to uploadBiltyImage()
};
```

---

## 📊 Quick Reference

```
┌───────────────────────────────────────────────────────────┐
│  BUCKET:  "bilty"   (single bucket for all bilty images)  │
│  FOLDER:  bilty-images/                                   │
│  FILE:    {gr_no}_{timestamp}.{ext}                       │
│  COLUMN:  bilty_image (TEXT, nullable)                     │
└───────────────────────────────────────────────────────────┘

Which DB table?
  bilty.station exists?
    YES → station_bilty_summary
    NO  → bilty

Upload in React Native:
  1. pickImage()                      → get { uri, type, fileSize }
  2. fetch(uri) → .blob()            → convert to Blob (NOT base64)
  3. supabase.storage.upload(blob)    → upload to "bilty" bucket
  4. supabase.storage.getPublicUrl()  → get full URL
  5. supabase.from(table).update()    → save URL in bilty_image column
```

---

## ⚠️ Important Notes

1. **Single bucket** — all bilty images go to the `bilty` bucket, not `transit-bilty`
2. **Bucket is public** — images served via public URLs, no auth needed to view
3. **No base64** — use `fetch(uri)` → `.blob()` in React Native to get uploadable data
4. **No extra packages** — `fetch` + `blob` is built into React Native, no `base64-arraybuffer` needed
5. **`upsert: true`** — overwrites if same filename exists
6. **File size limit** — validate ≤ 10 MB before uploading
7. **Table detection** — check if `bilty.station` exists to pick the right DB table
