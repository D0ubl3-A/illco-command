PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS validation_requirements (
  asset_type TEXT NOT NULL CHECK(asset_type IN ('character','fx')),
  test_name TEXT NOT NULL,
  mandatory INTEGER NOT NULL DEFAULT 1 CHECK(mandatory IN (0,1)),
  PRIMARY KEY(asset_type, test_name)
);

INSERT OR IGNORE INTO validation_requirements(asset_type,test_name,mandatory) VALUES
('character','file_exists',1),
('character','open_success',1),
('character','png_format',1),
('character','dimensions',1),
('character','color_mode',1),
('character','pure_chroma',1),
('character','low_spill',1),
('character','clean_edge',1),
('character','no_clipping',1),
('character','safe_crop',1),
('character','no_text_logo_watermark',1),
('character','no_identifiable_likeness',1),
('character','clay_texture_readable',1),
('character','identity_consistency',1),
('character','phase_consistency',1),
('fx','file_exists',1),
('fx','open_success',1),
('fx','png_format',1),
('fx','dimensions',1),
('fx','valid_alpha',1),
('fx','nonempty_alpha_bounds',1),
('fx','no_opaque_box',1),
('fx','premultiplication',1),
('fx','clean_edge',1),
('fx','safe_crop',1),
('fx','pivot',1),
('fx','sequence_metadata',1),
('fx','compositing_layer',1),
('fx','blend_recommendation',1),
('fx','direction_scale_emission',1);

CREATE TRIGGER IF NOT EXISTS trg_validation_requirements_no_update
BEFORE UPDATE ON validation_requirements
BEGIN
  SELECT RAISE(ABORT, 'validation requirements are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_validation_requirements_no_delete
BEFORE DELETE ON validation_requirements
BEGIN
  SELECT RAISE(ABORT, 'validation requirements are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_validated_transition_requires_suite
BEFORE INSERT ON transition_intents
WHEN NEW.to_status = 'validated'
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM evidence e
      WHERE e.id = NEW.evidence_id
        AND e.asset_id = NEW.asset_id
        AND e.kind = 'validation-suite'
    ) THEN RAISE(ABORT, 'validated requires matching validation-suite evidence')
    WHEN EXISTS (
      SELECT 1
      FROM validation_requirements r
      JOIN ownership o ON o.asset_id = NEW.asset_id AND o.asset_type = r.asset_type
      WHERE r.mandatory = 1
        AND NOT EXISTS (
          SELECT 1 FROM validations v
          WHERE v.asset_id = NEW.asset_id
            AND v.test_name = r.test_name
            AND v.passed = 1
        )
    ) THEN RAISE(ABORT, 'validated requires every mandatory validation test to pass')
    WHEN EXISTS (
      SELECT 1 FROM validations v
      JOIN validation_requirements r ON r.test_name = v.test_name AND r.mandatory = 1
      JOIN ownership o ON o.asset_id = v.asset_id AND o.asset_type = r.asset_type
      WHERE v.asset_id = NEW.asset_id AND v.passed = 0
    ) THEN RAISE(ABORT, 'validated blocked by failed mandatory validation test')
  END;
END;
