-- Returns UA counts per token per category for all specified category keys and
-- tokens.
--
-- Keys:
--
--   - One or more `sniffle:<attrId>:category:<category name>` keys.
--
-- Args:
--
--   - One or more tokens to look up in all category hashes.

local categories = {}

for i, key in pairs(KEYS) do
    categories[i] = redis.call('HMGET', key, unpack(ARGV))
end

return categories
