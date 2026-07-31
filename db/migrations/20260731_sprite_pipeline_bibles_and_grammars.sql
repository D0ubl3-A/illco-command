BEGIN;

CREATE TABLE IF NOT EXISTS sprite_character_bibles (
  bible_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  originality_declaration text NOT NULL,
  prohibited_likeness_notes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  PRIMARY KEY (bible_id, version),
  CHECK ((locked AND locked_at IS NOT NULL) OR (NOT locked AND locked_at IS NULL)),
  CHECK (jsonb_typeof(payload) = 'object'),
  CHECK (jsonb_typeof(prohibited_likeness_notes) = 'array')
);

CREATE TABLE IF NOT EXISTS sprite_fx_bibles (
  bible_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  originality_declaration text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  PRIMARY KEY (bible_id, version),
  CHECK ((locked AND locked_at IS NOT NULL) OR (NOT locked AND locked_at IS NULL)),
  CHECK (jsonb_typeof(payload) = 'object')
);

CREATE TABLE IF NOT EXISTS sprite_action_grammars (
  grammar_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  action text NOT NULL,
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  PRIMARY KEY (grammar_id, version),
  UNIQUE (action, version),
  CHECK ((locked AND locked_at IS NOT NULL) OR (NOT locked AND locked_at IS NULL)),
  CHECK (jsonb_typeof(payload) = 'object')
);

CREATE TABLE IF NOT EXISTS sprite_prompt_versions (
  prompt_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  asset_id text NOT NULL REFERENCES sprite_assets(id),
  bible_kind text NOT NULL CHECK (bible_kind IN ('character', 'fx')),
  bible_id text NOT NULL,
  bible_version integer NOT NULL CHECK (bible_version > 0),
  grammar_id text,
  grammar_version integer,
  prompt_text text NOT NULL,
  negative_prompt text NOT NULL,
  provider text NOT NULL,
  model_version text NOT NULL,
  parameters jsonb NOT NULL,
  prompt_sha256 char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prompt_id, version),
  UNIQUE (asset_id, version),
  CHECK (jsonb_typeof(parameters) = 'object'),
  CHECK ((grammar_id IS NULL AND grammar_version IS NULL) OR (grammar_id IS NOT NULL AND grammar_version IS NOT NULL))
);

CREATE OR REPLACE FUNCTION sprite_assert_prompt_bindings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  bible_locked boolean;
  grammar_locked boolean;
BEGIN
  IF NEW.bible_kind = 'character' THEN
    SELECT locked INTO bible_locked
    FROM sprite_character_bibles
    WHERE bible_id = NEW.bible_id AND version = NEW.bible_version;
  ELSE
    SELECT locked INTO bible_locked
    FROM sprite_fx_bibles
    WHERE bible_id = NEW.bible_id AND version = NEW.bible_version;
  END IF;

  IF bible_locked IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'prompt must bind to an existing locked % bible % version %', NEW.bible_kind, NEW.bible_id, NEW.bible_version;
  END IF;

  IF NEW.grammar_id IS NOT NULL THEN
    SELECT locked INTO grammar_locked
    FROM sprite_action_grammars
    WHERE grammar_id = NEW.grammar_id AND version = NEW.grammar_version;
    IF grammar_locked IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'prompt must bind to an existing locked grammar % version %', NEW.grammar_id, NEW.grammar_version;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sprite_prompt_bindings ON sprite_prompt_versions;
CREATE TRIGGER trg_sprite_prompt_bindings
BEFORE INSERT OR UPDATE ON sprite_prompt_versions
FOR EACH ROW EXECUTE FUNCTION sprite_assert_prompt_bindings();

CREATE OR REPLACE FUNCTION sprite_prevent_locked_bible_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.locked THEN
    RAISE EXCEPTION 'locked bible or grammar versions are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_character_bible_immutable ON sprite_character_bibles;
CREATE TRIGGER trg_character_bible_immutable
BEFORE UPDATE OR DELETE ON sprite_character_bibles
FOR EACH ROW EXECUTE FUNCTION sprite_prevent_locked_bible_mutation();

DROP TRIGGER IF EXISTS trg_fx_bible_immutable ON sprite_fx_bibles;
CREATE TRIGGER trg_fx_bible_immutable
BEFORE UPDATE OR DELETE ON sprite_fx_bibles
FOR EACH ROW EXECUTE FUNCTION sprite_prevent_locked_bible_mutation();

DROP TRIGGER IF EXISTS trg_action_grammar_immutable ON sprite_action_grammars;
CREATE TRIGGER trg_action_grammar_immutable
BEFORE UPDATE OR DELETE ON sprite_action_grammars
FOR EACH ROW EXECUTE FUNCTION sprite_prevent_locked_bible_mutation();

CREATE INDEX IF NOT EXISTS idx_sprite_prompts_asset ON sprite_prompt_versions(asset_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_sprite_prompts_bible ON sprite_prompt_versions(bible_kind, bible_id, bible_version);
CREATE INDEX IF NOT EXISTS idx_sprite_prompts_grammar ON sprite_prompt_versions(grammar_id, grammar_version) WHERE grammar_id IS NOT NULL;

COMMIT;
