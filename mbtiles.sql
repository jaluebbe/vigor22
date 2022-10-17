BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "tiles" (
	"zoom_level"	integer,
	"tile_column"	integer,
	"tile_row"	integer,
	"tile_data"	blob,
	"last_modified"	datetime DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS "metadata" (
	"name"	text,
	"value"	text
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tile" ON "tiles" (
	"zoom_level",
	"tile_column",
	"tile_row"
);
COMMIT;
