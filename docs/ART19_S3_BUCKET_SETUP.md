# ART19 S3 bucket — setup for the daily listen export

Goal: a private Amazon S3 folder ART19 can drop a CSV into every night.
Once Bill has the **bucket name** and **region**, he turns the delivery on.
Our dashboard's "Listens · last 30d" tile lights up after we ingest those files.

This is **not** the Art19 website. It is **Amazon Web Services** (AWS).

Recommended values (use these unless a name is already taken):

| Setting | Value |
|---|---|
| Bucket name | `ghostsignal-art19-listens` |
| Region | `US East (N. Virginia) us-east-1` |
| Object Ownership | **Bucket owner enforced** (ACLs off) |
| Block public access | **On** (leave all four boxes checked) |
| Encryption | **SSE-S3** (Amazon S3 managed keys) — do not pick KMS |

ART19 delivers overnight US time, so `us-east-1` is the natural region.

Bill's email stripped the `*` characters from the policy (`"s3:"` and
`{bucket}/`). The policy below restores them. ART19's delivery account is
`arn:aws:iam::644399368997:root`.

---

## 0. Amazon AWS account

If you already have an AWS login, skip to step 1.

1. Open <https://aws.amazon.com/> and click **Create an AWS Account**.
2. Use a GhostSignal email (not a personal shopping-Amazon login).
3. They will ask for a credit card. S3 storage for these files is typically
   cents per month; they will not charge a monthly "hosting plan."
4. Finish the account, then sign in to the **AWS Console**.

---

## 1. Open S3

1. Sign in at <https://console.aws.amazon.com/>.
2. In the search bar at the top, type **S3** and open **S3** (not "S3 Glacier",
   not "S3 Tables").
3. Top-right, confirm the region dropdown says **N. Virginia** (or switch to
   it). The bucket will live in whichever region is selected at create time.

---

## 2. Create the bucket

Click **Create bucket**. Work top to bottom:

1. **Bucket type:** General purpose.
2. **Bucket name:** `ghostsignal-art19-listens`
   - Must be lowercase, no spaces. Globally unique across all of Amazon.
   - If it says the name is taken, add a short suffix
     (`ghostsignal-art19-listens-2026`) and use that name everywhere below.
3. **AWS Region:** `US East (N. Virginia) us-east-1`.
4. **Object Ownership:** **ACLs disabled (recommended)** /
   **Bucket owner enforced**. This is Bill's "Disable ACLs" step.
5. **Block Public Access:** leave **Block all public access** ON.
   Granting ART19's AWS account access via a bucket policy is not "public."
6. **Bucket Versioning:** Disable (default).
7. **Default encryption:** **SSE-S3** (Amazon S3 managed key). Do not choose
   AWS KMS — ART19 would not have permission to write.
8. Leave tags empty.
9. Click **Create bucket**.

You should land on the bucket. Copy the name from the header — that is the
name you send Bill.

---

## 3. Paste the bucket policy

1. Open the bucket → **Permissions** tab.
2. Scroll to **Bucket policy** → **Edit**.
3. Paste this, with `{bucket}` already filled for the recommended name.
   If you used a different name, replace both occurrences.

```json
{
  "Version": "2012-10-17",
  "Id": "Policy1496425616987",
  "Statement": [
    {
      "Sid": "Stmt1496425613703",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::644399368997:root"
      },
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::ghostsignal-art19-listens",
        "arn:aws:s3:::ghostsignal-art19-listens/*"
      ]
    }
  ]
}
```

4. Click **Save changes**. AWS should accept it.

If save fails with a syntax error, the name in the policy does not match the
real bucket name. Fix the two `arn:aws:s3:::` lines and save again.

---

## 4. What to send Bill

| Field | Value |
|---|---|
| Bucket Name | `ghostsignal-art19-listens` (or the name you actually created) |
| Bucket Region | `us-east-1` |

That is all he asked for. Do not send AWS access keys. Do not make the
bucket public. He already has permission through the policy in step 3.

---

## After he confirms

Files land each morning UTC, with stats from ~48 hours earlier. A one-off
backfill follows once the first delivery works. Then we write the ingest
into `art19_listens_daily` so `/admin/art19` shows last-30-days listens.

The dashboard code is already waiting; it will not light up until those
files exist and we ingest them.
