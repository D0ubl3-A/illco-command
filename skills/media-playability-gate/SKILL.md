---
name: media-playability-gate
version: 1.0.0
description: Validate and package every generated, edited, rendered, attached, embedded, hosted, or delivered video before it is presented as playable. Use with AutoTube, email campaigns, websites, social posts, demos, downloads, and any MP4 or WebM output. This is a mandatory final gate whenever a user reports playback trouble or a workflow delivers video.
---

# Media Playability Gate

A video is not complete because an encoder created a file. It is complete only after conservative encoding, structural validation, full decoding, delivery validation, and a real fallback path.

## Governing rule

> Never label a video playable, complete, approved, embedded, or ready until every required gate below passes.

When a gate cannot be executed, report the output as unverified and do not claim compatibility.

## Required release gates

### 1. Conservative encoding

The default universal MP4 must use:

- MP4 container
- H.264/AVC video
- Constrained Baseline profile unless the target platform explicitly requires another profile
- `yuv420p` pixel format
- zero B-frames
- one reference frame where practical
- constant frame rate
- square pixels (`SAR 1:1`)
- AAC Low Complexity audio
- mono or stereo audio
- 44.1 kHz or 48 kHz sample rate
- timestamps beginning near zero
- a keyframe interval near two seconds
- `+faststart`
- an MP4 brand broadly recognized by browsers and phones

For downloads intended for weak devices or unknown clients, prefer 854×480 or 1280×720 over 1080p unless higher resolution is necessary.

### 2. Structural MP4 validation

Verify with `ffprobe` that:

- the container is MP4
- there is exactly one expected video stream
- the expected audio stream exists
- codecs, profiles, dimensions, pixel format, frame rate, sample rate, and channels match the delivery contract
- video and audio start near zero
- duration is positive and plausible
- the file is not unexpectedly small

Inspect the ISO BMFF atom order. The `moov` atom must occur before the first `mdat` atom so progressive playback can begin before the complete file downloads.

### 3. Complete decode validation

Decode the entire delivered artifact, not merely the first frame:

```bash
ffmpeg -hide_banner -loglevel error -xerror \
  -i output.mp4 \
  -map 0:v:0 -map 0:a:0 \
  -f null -
```

Any decoder warning promoted by `-xerror`, corrupt frame, timestamp failure, missing stream, or nonzero exit blocks delivery.

### 4. Delivery validation

For local or chat delivery:

- use a simple root-level filename
- avoid special characters and deeply nested paths
- provide a direct MP4 link
- provide a separate WebM fallback when the client is unknown or a playback failure has occurred
- provide a standalone HTML player containing both sources

For hosted delivery:

- require public HTTPS
- send the correct `Content-Type`
- support byte-range requests
- return an accurate `Content-Length`
- do not require cookies or expiring authentication that the target player cannot supply
- test a ranged request and a complete request

### 5. Email video rule

Most email clients do not reliably play an MP4 inside the message.

For email:

1. create a premium poster image with a visible play control
2. link it to a hosted landing-page player
3. optionally include native `<video>` for supporting clients
4. include both MP4 and WebM sources on the landing page
5. preserve an image-link fallback for Outlook and other unsupported clients
6. never embed a large base64 video in the email
7. never describe a poster link as an embedded playable video

### 6. Evidence receipt

Attach a machine-readable validation report containing:

- validation status
- file size
- duration
- dimensions
- declared and average frame rate
- container and compatible brands
- video codec, profile, pixel format, B-frame count
- audio codec, profile, sample rate, channels
- progressive-download result
- complete-decode result
- delivery URLs or local filenames
- fallback format

## AutoTube integration

An AutoTube job may not enter `ready` status until:

- the universal delivery encode exists
- structural validation passes
- complete decode passes
- the playability report is stored in output metadata

A render that fails this gate must enter a failed state with a specific playability error. It must never expose a supposedly ready artifact first and validate later.

## Playback-failure response

When a user says a video will not play:

1. treat the report as valid even when the file decodes locally
2. distinguish corruption from client/delivery incompatibility
3. inspect the exact delivered file
4. rebuild a lower-complexity universal MP4
5. create a WebM fallback
6. create a dual-source player page
7. validate both files completely
8. provide simple direct links
9. add or strengthen the permanent gate that allowed the failure

Do not repeatedly return the same file under a different name.

## Blockers

Block delivery when any of the following is true:

- full decode was not executed
- H.264/AAC output does not match the declared contract
- frame rate is variable when constant frame rate was promised
- pixel format is not broadly compatible
- video contains B-frames while universal-baseline delivery was promised
- MP4 metadata is not progressive-download safe
- audio or video starts materially after zero
- the output is incomplete or implausibly small
- hosted range behavior is required but untested
- email HTML has no poster-link fallback
- only one format is supplied after a confirmed playback failure

## Completion standard

A video delivery is complete only when:

- the primary MP4 passes all gates
- a validation receipt exists
- the direct link is simple and correct
- the target delivery surface is represented honestly
- a tested fallback exists when required

No automated test can guarantee playback in every future device or application. This gate minimizes preventable failures and requires transparent fallback instead of making an absolute compatibility claim.
