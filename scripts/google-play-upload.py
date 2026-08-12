#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path
from urllib.parse import quote

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

SCOPE = "https://www.googleapis.com/auth/androidpublisher"
API = "https://androidpublisher.googleapis.com/androidpublisher/v3"
UPLOAD_API = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3"


def die(message: str, code: int = 1):
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(code)


def request_json(method, url, token, **kwargs):
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, url, headers=headers, timeout=180, **kwargs)
    if not r.ok:
        try:
            detail = json.dumps(r.json(), indent=2)
        except Exception:
            detail = r.text
        die(f"Google Play API {r.status_code} for {method} {url}\n{detail}")
    if not r.content:
        return {}
    return r.json()


def main():
    p = argparse.ArgumentParser(description="Upload a signed Android App Bundle to Google Play")
    p.add_argument("--aab", required=True)
    p.add_argument("--package", default="tech.illcoai.app")
    p.add_argument("--track", default="internal")
    p.add_argument("--status", default="completed", choices=["draft", "inProgress", "halted", "completed"])
    p.add_argument("--release-name", default="iLLCo AI v1.0.0")
    p.add_argument("--changes-not-sent-for-review", action="store_true")
    args = p.parse_args()

    aab = Path(args.aab)
    if not aab.is_file():
        die(f"AAB not found: {aab}")

    raw = os.environ.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        die("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set")

    try:
        info = json.loads(raw)
    except json.JSONDecodeError as exc:
        die(f"GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON: {exc}")

    creds = service_account.Credentials.from_service_account_info(info, scopes=[SCOPE])
    creds.refresh(Request())
    token = creds.token

    package_q = quote(args.package, safe="")

    edit = request_json(
        "POST",
        f"{API}/applications/{package_q}/edits",
        token,
        json={},
    )
    edit_id = edit.get("id")
    if not edit_id:
        die(f"Google did not return an edit id: {edit}")
    print(f"Created edit {edit_id}")

    with aab.open("rb") as fh:
        bundle = request_json(
            "POST",
            f"{UPLOAD_API}/applications/{package_q}/edits/{quote(edit_id, safe='')}/bundles?uploadType=media",
            token,
            data=fh,
            headers={"Content-Type": "application/octet-stream"},
        )

    version_code = bundle.get("versionCode")
    if not version_code:
        die(f"Google did not return a versionCode: {bundle}")
    print(f"Uploaded AAB versionCode={version_code}")

    track_q = quote(args.track, safe="")
    track_body = {
        "track": args.track,
        "releases": [
            {
                "name": args.release_name,
                "versionCodes": [str(version_code)],
                "status": args.status,
            }
        ],
    }
    request_json(
        "PUT",
        f"{API}/applications/{package_q}/edits/{quote(edit_id, safe='')}/tracks/{track_q}",
        token,
        json=track_body,
    )
    print(f"Assigned versionCode={version_code} to track={args.track} status={args.status}")

    suffix = "?changesNotSentForReview=true" if args.changes_not_sent_for_review else ""
    committed = request_json(
        "POST",
        f"{API}/applications/{package_q}/edits/{quote(edit_id, safe='')}:commit{suffix}",
        token,
        json={},
    )
    print(json.dumps({
        "ok": True,
        "package": args.package,
        "track": args.track,
        "status": args.status,
        "versionCode": version_code,
        "edit": committed,
    }, indent=2))


if __name__ == "__main__":
    main()
