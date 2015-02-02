-- Gets the value of a single user agent attribute.
--
-- Keys:
--
--   - `sniffle:user-agents`
--
-- Args:
--
--   - User agent
--   - Attribute id
local keyUserAgents = KEYS[1]

local ua     = ARGV[1]
local attrId = ARGV[2]

-- Decode the stored attribute data for this user agent, if any.
local attrJson = redis.call('HGET', keyUserAgents, ua)

if attrJson then
    return cjson.decode(attrJson)[attrId]
end

return nil
