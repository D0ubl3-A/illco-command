# AutoTube 4 Runtime Integration

This branch activates the merged AutoTube 4 style engine only for requests that explicitly provide `style_id`, `intent`, or advanced scene fields.

Legacy `autotube_render_video` requests continue through the existing protected runtime unchanged.

Advanced requests are:

1. normalized into `AutoTubeVideoPlan`;
2. compiled through the selected style director bible and 12-stage pipeline;
3. scored against the 85-point publication threshold;
4. blocked when quality gates fail;
5. blocked when a requested renderer preset is unsupported;
6. submitted with the full production package persisted inside the render request;
7. rendered through the deterministic AutoTube 4 animation adapter;
8. verified with FFprobe before the job becomes ready.

The first renderer release supports deterministic camera, zoom, fade/reveal, parallax, orbit/float, pulse, glitch, morph, kinetic-text representation, UI-motion representation, and music-reactive representation. Character performance and lip sync remain explicit blockers until provider-backed adapters are added.
